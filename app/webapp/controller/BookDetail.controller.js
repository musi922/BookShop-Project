sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageBox, MessageToast, JSONModel) {
    "use strict";

    return Controller.extend("com.study.controller.BookDetail", {
        onInit: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("bookDetail").attachPatternMatched(this._onObjectMatched, this);
            
            // Initialize edit mode state
            this.getView().setModel(new JSONModel({
                editMode: false
            }), "view");
        },

        _onObjectMatched: function(oEvent) {
            var sBookId = oEvent.getParameter("arguments").bookId;
            
            // Bind the view to the specific book
            this.getView().bindElement({
                path: "/Books('" + sBookId + "')",
                parameters: {
                    $expand: "author"
                },
                events: {
                    dataRequested: function() {
                        this.getView().setBusy(true);
                    }.bind(this),
                    dataReceived: function() {
                        this.getView().setBusy(false);
                    }.bind(this)
                }
            });
        },

        onNavBack: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBooks", {}, true);
        },

        onEdit: function() {
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/editMode", true);
        },

        onSave: function() {
            var oContext = this.getView().getBindingContext();
            var oModel = this.getView().getModel();
            
            oModel.submitBatch("$auto").then(function() {
                MessageToast.show("Book updated successfully");
                this.getView().getModel("view").setProperty("/editMode", false);
            }.bind(this)).catch(function(oError) {
                MessageBox.error("Failed to update book: " + oError.message);
            });
        },

        onCancel: function() {
            var oModel = this.getView().getModel();
            oModel.resetChanges();
            this.getView().getModel("view").setProperty("/editMode", false);
        },

        onDelete: function() {
            var oContext = this.getView().getBindingContext();
            var oBook = oContext.getObject();
            
            MessageBox.confirm(
                "Are you sure you want to delete '" + oBook.title + "'?",
                {
                    title: "Confirm Deletion",
                    onClose: function(oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._deleteBook(oContext);
                        }
                    }.bind(this)
                }
            );
        },

        _deleteBook: function(oContext) {
            var oModel = this.getView().getModel();
            
            oContext.delete("$auto").then(function() {
                MessageToast.show("Book deleted successfully");
                this.onNavBack();
            }.bind(this)).catch(function(oError) {
                MessageBox.error("Failed to delete book: " + oError.message);
            });
        }
    });
});