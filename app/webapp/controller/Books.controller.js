sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (Controller, MessageToast, MessageBox, Filter, FilterOperator, JSONModel, Fragment) {
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

        onSearch: function(oEvent) {
            var sQuery = oEvent.getSource().getValue();
            console.log("search query", sQuery);
            
            var oTable = this.byId("booksTable");
            var oBinding = oTable.getBinding("items");
            
            var aFilters = [];
            
            if (sQuery && sQuery.length > 0) {
                var oFilterTitle = new Filter("title", FilterOperator.Contains, sQuery);
                var oFilterAuthor = new Filter("author/name", FilterOperator.Contains, sQuery);
                
                aFilters.push(new Filter({
                    filters: [oFilterTitle, oFilterAuthor],
                    and: false
                }));
            }
            
            oBinding.filter(aFilters);
            
            if (sQuery) {
                MessageToast.show("Searching for: " + sQuery);
            } else {
                MessageToast.show("Showing all books");
            }
        },

        // Fragment Dialog Management
        onOpenCreateDialog: function() {
            var oView = this.getView();
            
            // Create dialog lazily
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "com.study.view.CreateBookDialog",
                    controller: this
                }).then(function(oDialog) {
                    // Connect dialog to the view models
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            
            this._pDialog.then(function(oDialog) {
                // Reset the form data
                this.getView().getModel("newBook").setData({
                    title: "",
                    author_ID: "",
                    price: null,
                    stock: null
                });
                
                // Load authors if not already loaded
                this._loadAuthors();
                
                oDialog.open();
            }.bind(this));
        },

        _loadAuthors: function() {
            var oModel = this.getView().getModel();
            var oSelect = this.byId("authorSelect");
            
            // Trigger loading of authors if needed
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
            
            // Validate input
            if (!oNewBook.title || !oNewBook.author_ID || !oNewBook.price || !oNewBook.stock) {
                MessageBox.error("Please fill in all required fields");
                return;
            }
            
            // Validate that price and stock are positive numbers
            if (parseFloat(oNewBook.price) <= 0) {
                MessageBox.error("Price must be greater than 0");
                return;
            }
            
            if (parseInt(oNewBook.stock, 10) < 0) {
                MessageBox.error("Stock cannot be negative");
                return;
            }
            
            // Create the book entry
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
                    
                    // Refresh the table
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

        // Proper cleanup when controller is destroyed
        onExit: function() {
            if (this._pDialog) {
                this._pDialog.then(function(oDialog) {
                    oDialog.destroy();
                });
            }
        }
    });
});