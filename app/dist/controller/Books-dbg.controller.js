sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, Filter, FilterOperator) {
    "use strict";
    
    return Controller.extend("com.study.controller.Books", {
        onInit: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteBooks").attachPatternMatched(this._onRouteMatched, this);
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
        }
    });
});