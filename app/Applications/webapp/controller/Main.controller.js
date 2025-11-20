sap.ui.define(
  [
    'sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/m/MessageBox',
    'sap/m/MessageToast',
  ],
  function (Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast) {
    'use strict';

    return Controller.extend('com.bank.controller.Main', {
      onInit: function () {
        // Initialize models
        const oViewModel = new JSONModel({
          applications: [],
          totalApplications: 0,
          busy: false,
        });
        this.getView().setModel(oViewModel);

        // Model for filter dialog
        const oFilterModel = new JSONModel({
          status: '',
          program: '',
          dateFrom: null,
          dateTo: null,
        });
        this.getView().setModel(oFilterModel, 'filterModel');

        // Model for details dialog
        const oDetailsModel = new JSONModel({});
        this.getView().setModel(oDetailsModel, 'detailsModel');

        // Load applications on init
        this.loadApplications();
      },

      // ==================== DATA LOADING ====================

      loadApplications: function () {
        const oView = this.getView();
        const oModel = oView.getModel();

        oModel.setProperty('/busy', true);
        sap.ui.core.BusyIndicator.show(0);

        // Fetch all applications from CAP service
        fetch('/odata/v4/bank/FundingApplications?$orderby=submittedAt desc', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to fetch applications');
            }
            return response.json();
          })
          .then(data => {
            const applications = data.value || [];

            // Parse payload for each application to extract additional info
            const enrichedApplications = applications.map(app => {
              try {
                const payload = JSON.parse(app.payload);
                return {
                  ...app,
                  applicantName: payload.applicant?.fullName || 'N/A',
                  applicantEmail: payload.applicant?.email || app.applicantEmail,
                  fundingAmount: payload.project?.fundingAmount || '0',
                  projectTitle: payload.project?.title || 'N/A',
                  // Store parsed payload for details view
                  parsedPayload: payload,
                };
              } catch (error) {
                console.error('Error parsing payload:', error);
                return {
                  ...app,
                  applicantName: 'N/A',
                  applicantEmail: app.applicantEmail || 'N/A',
                  fundingAmount: '0',
                  projectTitle: 'N/A',
                };
              }
            });

            oModel.setProperty('/applications', enrichedApplications);
            oModel.setProperty('/totalApplications', enrichedApplications.length);
            oModel.setProperty('/busy', false);

            sap.ui.core.BusyIndicator.hide();
            MessageToast.show(`Loaded ${enrichedApplications.length} applications`);
          })
          .catch(error => {
            console.error('Load applications error:', error);
            oModel.setProperty('/busy', false);
            sap.ui.core.BusyIndicator.hide();
            MessageBox.error('Failed to load applications: ' + error.message);
          });
      },

      onRefresh: function () {
        this.loadApplications();
      },

      // ==================== SEARCH AND FILTER ====================

      onSearch: function (oEvent) {
        const sQuery = oEvent.getParameter('query') || oEvent.getParameter('newValue');
        const oTable = this.byId('applicationsTable');
        const oBinding = oTable.getBinding('items');

        if (!oBinding) return;

        const aFilters = [];

        if (sQuery && sQuery.length > 0) {
          const oFilter = new Filter({
            filters: [
              new Filter('applicantName', FilterOperator.Contains, sQuery),
              new Filter('applicantEmail', FilterOperator.Contains, sQuery),
              new Filter('programName', FilterOperator.Contains, sQuery),
              new Filter('ID', FilterOperator.Contains, sQuery),
            ],
            and: false,
          });
          aFilters.push(oFilter);
        }

        oBinding.filter(aFilters);
      },

      onOpenFilterDialog: function () {
        if (!this._oFilterDialog) {
          this._oFilterDialog = this.byId('filterDialog');
        }
        this._oFilterDialog.open();
      },

      onApplyFilter: function () {
        const oFilterModel = this.getView().getModel('filterModel');
        const oTable = this.byId('applicationsTable');
        const oBinding = oTable.getBinding('items');

        if (!oBinding) return;

        const aFilters = [];

        // Status filter
        const sStatus = oFilterModel.getProperty('/status');
        if (sStatus) {
          aFilters.push(new Filter('status', FilterOperator.EQ, sStatus));
        }

        // Program filter
        const sProgram = oFilterModel.getProperty('/program');
        if (sProgram) {
          aFilters.push(new Filter('programId', FilterOperator.EQ, sProgram));
        }

        // Date range filter
        const oDateFrom = oFilterModel.getProperty('/dateFrom');
        const oDateTo = oFilterModel.getProperty('/dateTo');

        if (oDateFrom) {
          aFilters.push(new Filter('submittedAt', FilterOperator.GE, oDateFrom));
        }
        if (oDateTo) {
          aFilters.push(new Filter('submittedAt', FilterOperator.LE, oDateTo));
        }

        oBinding.filter(aFilters);
        this._oFilterDialog.close();

        MessageToast.show('Filters applied');
      },

      onClearFilter: function () {
        const oFilterModel = this.getView().getModel('filterModel');
        oFilterModel.setData({
          status: '',
          program: '',
          dateFrom: null,
          dateTo: null,
        });

        const oTable = this.byId('applicationsTable');
        const oBinding = oTable.getBinding('items');
        if (oBinding) {
          oBinding.filter([]);
        }

        this._oFilterDialog.close();
        MessageToast.show('Filters cleared');
      },

      onDateRangeChange: function (oEvent) {
        const oDateRange = oEvent.getSource();
        const oFilterModel = this.getView().getModel('filterModel');

        oFilterModel.setProperty('/dateFrom', oDateRange.getDateValue());
        oFilterModel.setProperty('/dateTo', oDateRange.getSecondDateValue());
      },

      onItemPress: function (oEvent) {
        const oItem = oEvent.getParameter('listItem');
        const oContext = oItem.getBindingContext();

        if (oContext) {
          const oData = oContext.getObject();
          this.navigateToDetail(oData.ID);
        }
      },
      navigateToDetail: function (sApplicationId) {
        const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo('detail', {
          applicationId: sApplicationId,
        });
      },

      // ==================== EXPORT ====================

      onExportToExcel: function () {
        const oModel = this.getView().getModel();
        const aApplications = oModel.getProperty('/applications');

        if (!aApplications || aApplications.length === 0) {
          MessageToast.show('No data to export');
          return;
        }

        try {
          const sCsv = this._generateCSV(aApplications);
          this._downloadFile(sCsv, 'funding-applications.csv', 'text/csv');
          MessageToast.show('Export successful');
        } catch (error) {
          console.error('Export error:', error);
          MessageBox.error('Failed to export data');
        }
      },

      _generateCSV: function (aApplications) {
        const aHeaders = [
          'Application ID',
          'Program ID',
          'Program Name',
          'Applicant Name',
          'Email',
          'Project Title',
          'Funding Amount',
          'Status',
          'Submitted Date',
        ];

        const aRows = [aHeaders];

        aApplications.forEach(app => {
          aRows.push([
            app.ID || '',
            app.programId || '',
            app.programName || '',
            app.applicantName || '',
            app.applicantEmail || '',
            app.projectTitle || '',
            app.fundingAmount || '',
            app.status || '',
            app.submittedAt || '',
          ]);
        });

        return aRows
          .map(row =>
            row
              .map(cell => {
                const cellStr = (cell || '').toString();
                if (cellStr.indexOf(',') > -1 || cellStr.indexOf('"') > -1) {
                  return '"' + cellStr.replace(/"/g, '""') + '"';
                }
                return cellStr;
              })
              .join(',')
          )
          .join('\n');
      },

      _downloadFile: function (sContent, sFileName, sMimeType) {
        const blob = new Blob([sContent], { type: sMimeType });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = sFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      },

      // ==================== FORMATTERS ====================

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

      // ==================== NAVIGATION ====================

      onNavBack: function () {
        const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo('main'); // Navigate back to main view
      },

      onApprove: function (oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) return;

        const oData = oContext.getObject();

        MessageBox.confirm(`Approve application ${oData.ID}?`, {
          title: 'Approval',
          onClose: action => {
            if (action === MessageBox.Action.OK) {
              this.updateStatus(oData.ID, 'APPROVED');
            }
          },
        });
      },

      onReject: function (oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) return;

        const oData = oContext.getObject();

        MessageBox.confirm(`Reject application ${oData.ID}?`, {
          title: 'Rejection',
          onClose: action => {
            if (action === MessageBox.Action.OK) {
              this.updateStatus(oData.ID, 'REJECTED');
            }
          },
        });
      },
      updateStatus: function (sId, sStatus) {
        sap.ui.core.BusyIndicator.show(0);

        fetch(`/odata/v4/bank/FundingApplications(${sId})`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: sStatus,
          }),
        })
          .then(response => {
            if (!response.ok) throw new Error('Status update failed');
            return response.json();
          })
          .then(() => {
            sap.ui.core.BusyIndicator.hide();
            MessageToast.show(`Application ${sStatus.toLowerCase()} successfully`);
            this.loadApplications(); // reload table
          })
          .catch(error => {
            sap.ui.core.BusyIndicator.hide();
            MessageBox.error(error.message);
          });
      },
    });
  }
);
