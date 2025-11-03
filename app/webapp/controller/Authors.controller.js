sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.study.controller.Authors", {
        
        // Pagination properties
        _currentPage: 1,
        _pageSize: 7,  // Items per page
        _totalItems: 0,
        
        onInit: function () {
            // Initialize pagination
            this._currentPage = 1;
            this._pageSize = 7;
            this._totalItems = 0;
        },

        onSmartTableInit: function() {
            // Rebind the table after SmartTable is initialized
            let oSmartTable = this.byId("smartTable");
            if (oSmartTable) {
                // Get the inner table
                let oTable = oSmartTable.getTable();
                if (oTable) {
                    // Disable growing to use manual pagination
                    oTable.setGrowing(false);
                    oTable.setGrowingThreshold(0);
                }
                oSmartTable.rebindTable();
            }
        },

        onBeforeRebindTable: function(oEvent) {
            let mBindingParams = oEvent.getParameter("bindingParams");
            
            // Initialize parameters object if it doesn't exist
            if (!mBindingParams.parameters) {
                mBindingParams.parameters = {};
            }
            
            // Calculate skip value for pagination
            let iSkip = (this._currentPage - 1) * this._pageSize;
            
            // CRITICAL: Set these parameters for proper pagination
            mBindingParams.length = this._pageSize;
            mBindingParams.startIndex = 0;
            
            // Set OData parameters
            mBindingParams.parameters.$skip = iSkip;
            mBindingParams.parameters.$top = this._pageSize;
            mBindingParams.parameters.$count = true;
            mBindingParams.parameters.$inlinecount = "allpages";
            
            // Force client operation mode OFF
            delete mBindingParams.parameters.operationMode;
            
            // Attach event to update pagination info after data is loaded
            // Using the same approach as your working code
            setTimeout(function() {
                let oSmartTable = this.byId("smartTable");
                if (oSmartTable) {
                    let oTable = oSmartTable.getTable();
                    if (oTable) {
                        let oBinding = oTable.getBinding("items");
                        if (oBinding) {
                            // Remove previous listener to avoid duplicates
                            oBinding.detachEvent("dataReceived", this._onDataReceived, this);
                            // Attach new listener
                            oBinding.attachEventOnce("dataReceived", this._onDataReceived, this);
                        }
                    }
                }
            }.bind(this), 100);
        },

        _onDataReceived: function(oEvent) {
            let oBinding = oEvent.getSource();
            let oData = oEvent.getParameter("data");
            
            console.log("Data received:", oData);
            console.log("Binding:", oBinding);
            
            // Get total count - try multiple ways (from your working code)
            if (oData && oData.__count) {
                // OData V2 inline count
                this._totalItems = parseInt(oData.__count, 10);
                console.log("Count from __count:", this._totalItems);
            } else if (oData && oData["$count"]) {
                // OData V4 count
                this._totalItems = parseInt(oData["$count"], 10);
                console.log("Count from $count:", this._totalItems);
            } else if (oBinding && oBinding.getLength) {
                // For client-side operation mode or fallback
                this._totalItems = oBinding.getLength();
                console.log("Count from binding.getLength():", this._totalItems);
            } else {
                // Fallback: count visible items
                let aContexts = oBinding.getContexts();
                this._totalItems = aContexts ? aContexts.length : 0;
                console.log("Count from contexts:", this._totalItems);
            }
            
            console.log("Final total items:", this._totalItems);
            
            // Update pagination UI
            this._updatePaginationControls();
        },

        _updatePaginationControls: function() {
            let iTotalPages = Math.ceil(this._totalItems / this._pageSize);
            let iStart = this._totalItems === 0 ? 0 : (this._currentPage - 1) * this._pageSize + 1;
            let iEnd = Math.min(this._currentPage * this._pageSize, this._totalItems);
            
            console.log("Updating pagination - Start:", iStart, "End:", iEnd, "Total:", this._totalItems, "Pages:", iTotalPages);
            
            // Update info text
            this.byId("paginationInfo").setText(iStart + "-" + iEnd + " of " + this._totalItems);
            
            // Update page input and total pages
            this.byId("currentPageInput").setValue(this._currentPage);
            this.byId("totalPagesText").setText("of " + (iTotalPages || 1));
            
            // Enable/disable navigation buttons
            let bHasPreviousPage = this._currentPage > 1;
            let bHasNextPage = this._currentPage < iTotalPages;
            
            this.byId("firstPageBtn").setEnabled(bHasPreviousPage);
            this.byId("previousPageBtn").setEnabled(bHasPreviousPage);
            this.byId("nextPageBtn").setEnabled(bHasNextPage);
            this.byId("lastPageBtn").setEnabled(bHasNextPage);
        },

        onFirstPage: function() {
            if (this._currentPage !== 1) {
                this._currentPage = 1;
                this._rebindTable();
            }
        },

        onPreviousPage: function() {
            if (this._currentPage > 1) {
                this._currentPage--;
                this._rebindTable();
            }
        },

        onNextPage: function() {
            let iTotalPages = Math.ceil(this._totalItems / this._pageSize);
            if (this._currentPage < iTotalPages) {
                this._currentPage++;
                this._rebindTable();
            }
        },

        onLastPage: function() {
            let iTotalPages = Math.ceil(this._totalItems / this._pageSize);
            if (this._currentPage !== iTotalPages && iTotalPages > 0) {
                this._currentPage = iTotalPages;
                this._rebindTable();
            }
        },

        onPageInputSubmit: function(oEvent) {
            let iPage = parseInt(oEvent.getParameter("value"), 10);
            let iTotalPages = Math.ceil(this._totalItems / this._pageSize);
            
            // Validate page number
            if (iPage >= 1 && iPage <= iTotalPages) {
                this._currentPage = iPage;
                this._rebindTable();
            } else {
                // Reset to current page if invalid
                this.byId("currentPageInput").setValue(this._currentPage);
                MessageToast.show("Please enter a valid page number (1-" + iTotalPages + ")");
            }
        },

        _rebindTable: function() {
            // Trigger table rebind
            let oSmartTable = this.byId("smartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable();
            }
        }
    });
});