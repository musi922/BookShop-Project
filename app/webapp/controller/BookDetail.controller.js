sap.ui.define(
  [
    'sap/ui/core/mvc/Controller',
    'sap/m/MessageBox',
    'sap/m/MessageToast',
    'sap/ui/model/json/JSONModel',
  ],
  function (Controller, MessageBox, MessageToast, JSONModel) {
    'use strict';

    return Controller.extend('com.study.controller.BookDetail', {
      onInit: function () {
        let oRouter = this.getOwnerComponent().getRouter();
        oRouter.getRoute('bookDetail').attachPatternMatched(this._onObjectMatched, this);

        // Initialize edit mode state
        this.getView().setModel(
          new JSONModel({
            editMode: false,
          }),
          'view'
        );
      },

      _onObjectMatched: function (oEvent) {
        let sBookId = oEvent.getParameter('arguments').bookId;

        // Bind the view to the specific book - OData V2 style
        this.getView().bindElement({
          path: "/Books('" + sBookId + "')",
          parameters: {
            expand: 'author', // OData V2 uses 'expand' not '$expand'
          },
          events: {
            dataRequested: function () {
              this.getView().setBusy(true);
            }.bind(this),
            dataReceived: function (oEvent) {
              this.getView().setBusy(false);

              // Check if data was received successfully
              let oData = oEvent.getParameter('data');
              if (!oData) {
                MessageBox.error('Book not found');
                this.onNavBack();
              }
            }.bind(this),
            change: function () {
              let oContext = this.getView().getBindingContext();
              if (!oContext) {
                MessageBox.error('Book not found');
                this.onNavBack();
              }
            }.bind(this),
          },
        });
      },

      onNavBack: function () {
        let oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo('RouteBooks', {}, true);
      },

      onEdit: function () {
        let oViewModel = this.getView().getModel('view');
        oViewModel.setProperty('/editMode', true);

        // Store original data for cancel
        let oContext = this.getView().getBindingContext();
        if (oContext) {
          this._oOriginalData = Object.assign({}, oContext.getObject());
        }
      },

      onSave: function () {
        let oModel = this.getView().getModel();
        let oContext = this.getView().getBindingContext();

        if (!oContext) {
          MessageBox.error('No data to save');
          return;
        }

        // Validate data
        let oData = oContext.getObject();
        if (!oData.title || oData.title.trim() === '') {
          MessageBox.error('Title cannot be empty');
          return;
        }

        if (!oData.price || parseFloat(oData.price) <= 0) {
          MessageBox.error('Price must be greater than 0');
          return;
        }

        if (oData.stock === null || oData.stock === undefined || parseInt(oData.stock) < 0) {
          MessageBox.error('Stock cannot be negative');
          return;
        }

        // OData V2: Submit changes
        oModel.submitChanges({
          success: function () {
            MessageToast.show('Book updated successfully');
            this.getView().getModel('view').setProperty('/editMode', false);
            this._oOriginalData = null;
          }.bind(this),
          error: function (oError) {
            let sMessage = 'Failed to update book';
            if (oError.responseText) {
              try {
                let oErrorResponse = JSON.parse(oError.responseText);
                sMessage = oErrorResponse.error.message.value || sMessage;
              } catch (e) {
                console.error(e.error);
              }
            }
            MessageBox.error(sMessage);
          }.bind(this),
        });
      },

      onCancel: function () {
        let oModel = this.getView().getModel();

        // OData V2: Reset changes
        oModel.resetChanges();

        this.getView().getModel('view').setProperty('/editMode', false);
        this._oOriginalData = null;

        MessageToast.show('Changes cancelled');
      },

      onDelete: function () {
        let oContext = this.getView().getBindingContext();

        if (!oContext) {
          MessageBox.error('No book to delete');
          return;
        }

        let oBook = oContext.getObject();

        MessageBox.confirm("Are you sure you want to delete '" + oBook.title + "'?", {
          title: 'Confirm Deletion',
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.OK) {
              this._deleteBook(oContext);
            }
          }.bind(this),
        });
      },

      _deleteBook: function (oContext) {
        let oModel = this.getView().getModel();
        let sPath = oContext.getPath();

        // OData V2: Use remove method
        oModel.remove(sPath, {
          success: function () {
            MessageToast.show('Book deleted successfully');
            this.onNavBack();
          }.bind(this),
          error: function (oError) {
            let sMessage = 'Failed to delete book';
            if (oError.responseText) {
              try {
                let oErrorResponse = JSON.parse(oError.responseText);
                sMessage = oErrorResponse.error.message.value || sMessage;
              } catch (e) {
                console.error(e.error);
              }
            }
            MessageBox.error(sMessage);
          },
        });
      },
    });
  }
);
