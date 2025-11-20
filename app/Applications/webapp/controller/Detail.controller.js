sap.ui.define(
  [
    'sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageBox',
    'sap/m/MessageToast',
  ],
  function (Controller, JSONModel, MessageBox, MessageToast) {
    'use strict';

    return Controller.extend('com.bank.controller.Detail', {
      onInit: function () {
        // Initialize detail model
        const oDetailModel = new JSONModel({});
        this.getView().setModel(oDetailModel, 'detailModel');

        // Get router and attach to route matched event
        const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.getRoute('detail').attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function (oEvent) {
        const sApplicationId = oEvent.getParameter('arguments').applicationId;
        this.loadApplicationDetails(sApplicationId);
      },

      loadApplicationDetails: function (sApplicationId) {
        const oView = this.getView();
        const oDetailModel = oView.getModel('detailModel');

        sap.ui.core.BusyIndicator.show(0);

        // Fetch application details from CAP service
        fetch(`/odata/v4/bank/FundingApplications(${sApplicationId})`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to fetch application details');
            }
            return response.json();
          })
          .then(data => {
            try {
              // Parse the payload to get full details
              const payload = JSON.parse(data.payload);

              // Prepare data for detail view
              const oDetailsData = {
                ID: data.ID,
                programId: data.programId,
                programName: data.programName,
                status: data.status,
                submittedAt: data.submittedAt,
                applicant: payload.applicant || {},
                project: payload.project || {},
                documents: [],
              };

              oDetailModel.setData(oDetailsData);

              // Load documents for this application
              this.loadApplicationDocuments(sApplicationId);
            } catch (error) {
              console.error('Error parsing payload:', error);
              sap.ui.core.BusyIndicator.hide();
              MessageBox.error('Failed to parse application data');
            }
          })
          .catch(error => {
            console.error('Load details error:', error);
            sap.ui.core.BusyIndicator.hide();
            MessageBox.error('Failed to load application details: ' + error.message);
          });
      },

      loadApplicationDocuments: function (sApplicationId) {
        fetch(`/odata/v4/bank/ApplicationDocuments?$filter=application_ID eq ${sApplicationId}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        })
          .then(response => response.json())
          .then(data => {
            const documents = data.value || [];

            const oDetailModel = this.getView().getModel('detailModel');
            oDetailModel.setProperty('/documents', documents);

            sap.ui.core.BusyIndicator.hide();
          })
          .catch(error => {
            console.error('Error loading documents:', error);
            sap.ui.core.BusyIndicator.hide();
          });
      },

      onDelete: function () {
        const oDetailModel = this.getView().getModel('detailModel');
        const sApplicationId = oDetailModel.getProperty('/ID');

        MessageBox.confirm(`Are you sure you want to delete application ${sApplicationId}?`, {
          title: 'Confirm Deletion',
          onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
              this.deleteApplication(sApplicationId);
            }
          }.bind(this),
        });
      },

      deleteApplication: function (sApplicationId) {
        sap.ui.core.BusyIndicator.show(0);

        fetch(`/odata/v4/bank/FundingApplications(${sApplicationId})`, {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
          },
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to delete application');
            }

            sap.ui.core.BusyIndicator.hide();
            MessageToast.show('Application deleted successfully');

            // Navigate back to main view
            this.onNavBack();
          })
          .catch(error => {
            sap.ui.core.BusyIndicator.hide();
            console.error('Delete error:', error);
            MessageBox.error('Failed to delete application: ' + error.message);
          });
      },

      onDocumentPress: function (oEvent) {
        const oItem = oEvent.getSource();
        const oContext = oItem.getBindingContext('detailModel');
        const oDocument = oContext.getObject();

        MessageToast.show('Document clicked: ' + oDocument.fileName);
        // TODO: Implement document download/view functionality
      },

      formatter: {
        statusState: function (sStatus) {
          switch (sStatus) {
            case 'SUBMITTED':
              return 'Information';
            case 'UNDER_REVIEW':
              return 'Warning';
            case 'APPROVED':
              return 'Success';
            case 'REJECTED':
              return 'Error';
            default:
              return 'None';
          }
        },
      },

      onNavBack: function () {
        const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo('main');
      },
    });
  }
);
