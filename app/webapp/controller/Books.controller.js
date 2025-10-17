sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (Controller, MessageToast, MessageBox, Filter, FilterOperator, Sorter, JSONModel, Fragment) {
    "use strict";
    
    return Controller.extend("com.study.controller.Books", {
        onInit: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteBooks").attachPatternMatched(this._onRouteMatched, this);
            
            // Initialize model for new book data
            this.getView().setModel(new JSONModel({
                title: "",
                author_ID: "",
                price: null,
                stock: null
            }), "newBook");
            
            // Store filter and sort state
            this._aCurrentFilters = [];
            this._oCurrentSorter = null;
            this._aFilterItems = [];
            this._sSortKey = null;
        },

        _onRouteMatched: function() {
            var oTable = this.byId("booksTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.refresh();
            }
        },

        onItemPress: function(oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var oBook = oContext.getObject();
            
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("bookDetail", {
                bookId: oBook.ID
            });
        },

        // ========== SEARCH FUNCTIONALITY ==========
        onSearch: function(oEvent) {
            var sQuery = oEvent.getSource().getValue();
            console.log("search query", sQuery);
            
            var oTable = this.byId("booksTable");
            var oBinding = oTable.getBinding("items");
            
            var aFilters = [];
            
            // Search filter (separate from other filters)
            if (sQuery && sQuery.length > 0) {
                var oFilterTitle = new Filter("title", FilterOperator.Contains, sQuery);
                var oFilterAuthor = new Filter("author/name", FilterOperator.Contains, sQuery);
                
                aFilters.push(new Filter({
                    filters: [oFilterTitle, oFilterAuthor],
                    and: false
                }));
            }
            
            // Combine with current filters
            var aAllFilters = aFilters.concat(this._aCurrentFilters);
            
            oBinding.filter(aAllFilters);
            
            if (sQuery) {
                MessageToast.show("Searching for: " + sQuery);
            }
        },

        // ========== FILTER DIALOG ==========
        onOpenFilter: function() {
            var oView = this.getView();
            
            // Create filter dialog lazily
            if (!this._pFilterDialog) {
                this._pFilterDialog = Fragment.load({
                    id: oView.getId(),
                    name: "com.study.view.FilterDialog",
                    controller: this
                }).then(function(oDialog) {
                    oView.addDependent(oDialog);
                    this._populateAuthorFilter();
                    return oDialog;
                }.bind(this));
            }
            
            this._pFilterDialog.then(function(oDialog) {
                oDialog.open();
            });
        },

        _populateAuthorFilter: function() {
            var oModel = this.getView().getModel();
            var oDialog = this.byId("filterDialog");
            
            if (!oDialog) return;
            
            // Get the author filter item
            var aFilterItems = oDialog.getFilterItems();
            var oAuthorFilterItem = null;
            
            aFilterItems.forEach(function(oItem) {
                if (oItem.getKey() === "author") {
                    oAuthorFilterItem = oItem;
                }
            });
            
            if (!oAuthorFilterItem) return;
            
            // Load authors and populate filter
            oModel.bindList("/Authors").requestContexts().then(function(aContexts) {
                oAuthorFilterItem.removeAllItems();
                
                aContexts.forEach(function(oContext) {
                    var oAuthor = oContext.getObject();
                    oAuthorFilterItem.addItem(new sap.m.ViewSettingsItem({
                        text: oAuthor.name,
                        key: oAuthor.ID
                    }));
                });
            });
        },

        onConfirmFilter: function(oEvent) {
            var oTable = this.byId("booksTable");
            var oBinding = oTable.getBinding("items");
            var mParams = oEvent.getParameters();
            
            // Get filter items
            var aFilterItems = mParams.filterItems;
            this._aFilterItems = aFilterItems;
            
            var aFilters = [];
            
            if (aFilterItems && aFilterItems.length > 0) {
                var aStockFilters = [];
                var aPriceFilters = [];
                var aAuthorFilters = [];
                
                aFilterItems.forEach(function(oItem) {
                    var sKey = oItem.getKey();
                    var sParentKey = oItem.getParent().getKey();
                    
                    // Stock filters
                    if (sParentKey === "stock") {
                        if (sKey === "highStock") {
                            aStockFilters.push(new Filter("stock", FilterOperator.GT, 200));
                        } else if (sKey === "mediumStock") {
                            aStockFilters.push(new Filter({
                                filters: [
                                    new Filter("stock", FilterOperator.GE, 100),
                                    new Filter("stock", FilterOperator.LE, 200)
                                ],
                                and: true
                            }));
                        } else if (sKey === "lowStock") {
                            aStockFilters.push(new Filter("stock", FilterOperator.LT, 100));
                        }
                    }
                    
                    // Price filters
                    if (sParentKey === "price") {
                        if (sKey === "budget") {
                            aPriceFilters.push(new Filter("price", FilterOperator.LT, 20));
                        } else if (sKey === "midrange") {
                            aPriceFilters.push(new Filter({
                                filters: [
                                    new Filter("price", FilterOperator.GE, 20),
                                    new Filter("price", FilterOperator.LE, 50)
                                ],
                                and: true
                            }));
                        } else if (sKey === "premium") {
                            aPriceFilters.push(new Filter("price", FilterOperator.GT, 50));
                        }
                    }
                    
                    // Author filters
                    if (sParentKey === "author") {
                        aAuthorFilters.push(new Filter("author_ID", FilterOperator.EQ, sKey));
                    }
                });
                
                // Combine filters with OR logic within each category
                if (aStockFilters.length > 0) {
                    aFilters.push(new Filter({
                        filters: aStockFilters,
                        and: false
                    }));
                }
                
                if (aPriceFilters.length > 0) {
                    aFilters.push(new Filter({
                        filters: aPriceFilters,
                        and: false
                    }));
                }
                
                if (aAuthorFilters.length > 0) {
                    aFilters.push(new Filter({
                        filters: aAuthorFilters,
                        and: false
                    }));
                }
            }
            
            // Store current filters
            this._aCurrentFilters = aFilters;
            
            // Apply filters (AND logic between categories)
            oBinding.filter(aFilters.length > 0 ? new Filter({
                filters: aFilters,
                and: true
            }) : []);
            
            // Update info toolbar
            this._updateFilterInfo();
            
            // Show success message
            if (aFilterItems.length > 0) {
                MessageToast.show("Applied " + aFilterItems.length + " filter(s)");
            } else {
                MessageToast.show("All filters cleared");
            }
        },

        onResetFilter: function() {
            this._aCurrentFilters = [];
            this._aFilterItems = [];
            
            var oTable = this.byId("booksTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter([]);
            
            this._updateFilterInfo();
            MessageToast.show("Filters reset");
        },

        // ========== SORT DIALOG ==========
        onOpenSort: function() {
            var oView = this.getView();
            
            // Create sort dialog lazily
            if (!this._pSortDialog) {
                this._pSortDialog = Fragment.load({
                    id: oView.getId(),
                    name: "com.study.view.SortDialog",
                    controller: this
                }).then(function(oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            
            this._pSortDialog.then(function(oDialog) {
                oDialog.open();
            });
        },

        onConfirmSort: function(oEvent) {
            var oTable = this.byId("booksTable");
            var oBinding = oTable.getBinding("items");
            var mParams = oEvent.getParameters();
            
            var sSortPath = mParams.sortItem ? mParams.sortItem.getKey() : null;
            this._sSortKey = sSortPath;
            
            if (sSortPath) {
                var oSorter;
                
                switch (sSortPath) {
                    case "title":
                        oSorter = new Sorter("title", false);
                        break;
                    case "title_desc":
                        oSorter = new Sorter("title", true);
                        break;
                    case "price_asc":
                        oSorter = new Sorter("price", false);
                        break;
                    case "price_desc":
                        oSorter = new Sorter("price", true);
                        break;
                    case "stock_asc":
                        oSorter = new Sorter("stock", false);
                        break;
                    case "stock_desc":
                        oSorter = new Sorter("stock", true);
                        break;
                    case "author_name":
                        oSorter = new Sorter("author/name", false);
                        break;
                }
                
                if (oSorter) {
                    this._oCurrentSorter = oSorter;
                    oBinding.sort(oSorter);
                    
                    // Update info toolbar
                    this._updateFilterInfo();
                    
                    MessageToast.show("Sorted: " + mParams.sortItem.getText());
                }
            }
        },

        // ========== CLEAR ALL ==========
        onClearAll: function() {
            var oTable = this.byId("booksTable");
            var oBinding = oTable.getBinding("items");
            
            // Reset all state
            this._aCurrentFilters = [];
            this._oCurrentSorter = null;
            this._aFilterItems = [];
            this._sSortKey = null;
            
            // Clear search field
            var oSearchField = this.byId("searchField");
            if (oSearchField) {
                oSearchField.setValue("");
            }
            
            // Reset table
            oBinding.filter([]);
            oBinding.sort([]);
            
            // Hide info toolbar
            this.byId("filterInfoToolbar").setVisible(false);
            
            MessageToast.show("All filters and sorting cleared");
        },

        _updateFilterInfo: function() {
            var oInfoToolbar = this.byId("filterInfoToolbar");
            var oFilterLabel = this.byId("filterLabel");
            
            var aInfoTexts = [];
            
            // Add filter info
            if (this._aFilterItems && this._aFilterItems.length > 0) {
                aInfoTexts.push("🔍 " + this._aFilterItems.length + " filter(s) active");
            }
            
            // Add sort info
            if (this._sSortKey) {
                var sSortText = this._getSortDisplayText(this._sSortKey);
                aInfoTexts.push("📊 Sorted by: " + sSortText);
            }
            
            if (aInfoTexts.length > 0) {
                oFilterLabel.setText(aInfoTexts.join("  |  "));
                oInfoToolbar.setVisible(true);
            } else {
                oInfoToolbar.setVisible(false);
            }
        },

        _getSortDisplayText: function(sSortKey) {
            var mSortTexts = {
                "title": "Title (A-Z)",
                "title_desc": "Title (Z-A)",
                "price_asc": "Price (Low to High)",
                "price_desc": "Price (High to Low)",
                "stock_asc": "Stock (Low to High)",
                "stock_desc": "Stock (High to Low)",
                "author_name": "Author Name"
            };
            return mSortTexts[sSortKey] || sSortKey;
        },

        // ========== CREATE BOOK DIALOG ==========
        onOpenCreateDialog: function() {
            var oView = this.getView();
            
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "com.study.view.CreateBookDialog",
                    controller: this
                }).then(function(oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            
            this._pDialog.then(function(oDialog) {
                this.getView().getModel("newBook").setData({
                    title: "",
                    author_ID: "",
                    price: null,
                    stock: null
                });
                
                this._loadAuthors();
                oDialog.open();
            }.bind(this));
        },

        _loadAuthors: function() {
            var oModel = this.getView().getModel();
            var oSelect = this.byId("authorSelect");
            
            if (oSelect) {
                var oBinding = oSelect.getBinding("items");
                if (oBinding) {
                    oBinding.refresh();
                }
            }
        },

        onCloseCreateDialog: function() {
            this.byId("createBookDialog").close();
        },

        onCreateBook: function() {
            var oModel = this.getView().getModel();
            var oNewBook = this.getView().getModel("newBook").getData();
            
            if (!oNewBook.title || !oNewBook.author_ID || !oNewBook.price || !oNewBook.stock) {
                MessageBox.error("Please fill in all required fields");
                return;
            }
            
            if (parseFloat(oNewBook.price) <= 0) {
                MessageBox.error("Price must be greater than 0");
                return;
            }
            
            if (parseInt(oNewBook.stock, 10) < 0) {
                MessageBox.error("Stock cannot be negative");
                return;
            }
            
            var oListBinding = oModel.bindList("/Books");
            
            try {
                var oContext = oListBinding.create({
                    title: oNewBook.title,
                    author_ID: oNewBook.author_ID,
                    price: parseFloat(oNewBook.price),
                    stock: parseInt(oNewBook.stock, 10)
                });
                
                oContext.created().then(function() {
                    MessageToast.show("Book '" + oNewBook.title + "' created successfully");
                    this.onCloseCreateDialog();
                    
                    var oTable = this.byId("booksTable");
                    var oBinding = oTable.getBinding("items");
                    if (oBinding) {
                        oBinding.refresh();
                    }
                }.bind(this)).catch(function(oError) {
                    MessageBox.error("Failed to create book: " + (oError.message || "Unknown error"));
                });
            } catch (e) {
                MessageBox.error("Failed to create book: " + e.message);
            }
        },

        // ========== CLEANUP ==========
        onExit: function() {
            if (this._pDialog) {
                this._pDialog.then(function(oDialog) {
                    oDialog.destroy();
                });
            }
            if (this._pFilterDialog) {
                this._pFilterDialog.then(function(oDialog) {
                    oDialog.destroy();
                });
            }
            if (this._pSortDialog) {
                this._pSortDialog.then(function(oDialog) {
                    oDialog.destroy();
                });
            }
        }
    });
});