sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.bank.controller.Main", {

        onInit: function () {
            // Initialize the data model
            var oModel = new JSONModel({
                selectedProgram: "",
                programName: "",
                programDescription: "",
                fundingRange: "",
                eligibility: "",
                currentStep: 0, // Start at step 0
                canProceed: false,
                termsAccepted: false,
                programValueState: "None",
                applicant: {
                    fullName: "",
                    email: "",
                    phone: "",
                    dateOfBirth: "",
                    address: "",
                    city: "",
                    country: "",
                    postalCode: ""
                },
                project: {
                    title: "",
                    description: "",
                    fundingAmount: "",
                    duration: "",
                    category: "",
                    startDate: ""
                }
            });
            this.getView().setModel(oModel);

            // Load program configurations
            this._loadProgramConfigs();

            // Debug: Check wizard steps on init
            var oWizard = this.byId("fundingWizard");
            if (oWizard) {
                var aSteps = oWizard.getSteps();
                console.log("Initialized wizard steps: ", aSteps.map(step => step.getId()));
                if (aSteps.length !== 4) {
                    console.error("Unexpected number of steps: ", aSteps.length);
                }
            }
        },

        _loadProgramConfigs: function () {
            this._programConfigs = {
                startup: {
                    name: "Startup Funding Program",
                    description: "Support for early-stage startups with innovative business ideas. This program provides seed funding to help entrepreneurs launch their ventures.",
                    fundingRange: "RWF 5,000,000 - RWF 50,000,000",
                    eligibility: "New businesses (less than 2 years old), registered in Rwanda, with a clear business plan and growth potential."
                },
                innovation: {
                    name: "Innovation Grant",
                    description: "Grants for innovative projects that bring new solutions to market challenges. Focus on technology-driven innovations.",
                    fundingRange: "RWF 10,000,000 - RWF 100,000,000",
                    eligibility: "Companies with proven innovation track record, patent or IP protection, and scalable business model."
                },
                sme: {
                    name: "SME Development Fund",
                    description: "Financial support for small and medium enterprises looking to expand operations, increase capacity, or enter new markets.",
                    fundingRange: "RWF 20,000,000 - RWF 200,000,000",
                    eligibility: "Registered SMEs operating for at least 2 years, with positive cash flow and clear expansion plans."
                },
                research: {
                    name: "Research & Development Grant",
                    description: "Funding for research and development projects in strategic sectors including agriculture, health, and technology.",
                    fundingRange: "RWF 15,000,000 - RWF 150,000,000",
                    eligibility: "Research institutions, universities, or companies with R&D departments. Must demonstrate research methodology and expected outcomes."
                }
            };
        },

        onProgramChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            var oModel = this.getView().getModel();
            var oConfig = this._programConfigs[sSelectedKey];

            if (oConfig) {
                oModel.setProperty("/selectedProgram", sSelectedKey);
                oModel.setProperty("/programName", oConfig.name);
                oModel.setProperty("/programDescription", oConfig.description);
                oModel.setProperty("/fundingRange", oConfig.fundingRange);
                oModel.setProperty("/eligibility", oConfig.eligibility);

                this._validateProgramStep();
            }
        },

        _validateProgramStep: function () {
            var oModel = this.getView().getModel();
            var oProgramStep = this.byId("programStep");

            var bValid = oModel.getProperty("/selectedProgram") !== "";

            if (bValid) {
                oProgramStep.setValidated(true);
                oModel.setProperty("/canProceed", true);
            } else {
                oProgramStep.setValidated(false);
                oModel.setProperty("/canProceed", false);
            }
        },

        onApplicantFieldChange: function () {
            this._validateApplicantStep();
        },

        _validateApplicantStep: function () {
            var oModel = this.getView().getModel();
            var oApplicantStep = this.byId("applicantStep");

            var oApplicant = oModel.getProperty("/applicant");

            var bValid = oApplicant.fullName &&
                oApplicant.email &&
                oApplicant.phone &&
                oApplicant.dateOfBirth &&
                oApplicant.city &&
                oApplicant.country;

            if (bValid && oApplicant.email) {
                var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                bValid = emailPattern.test(oApplicant.email);
            }

            if (bValid) {
                oApplicantStep.setValidated(true);
                oModel.setProperty("/canProceed", true);
            } else {
                oApplicantStep.setValidated(false);
                oModel.setProperty("/canProceed", false);
            }
        },

        onProjectFieldChange: function () {
            this._validateProjectStep();
        },

        _validateProjectStep: function () {
            var oModel = this.getView().getModel();
            var oProjectStep = this.byId("projectStep");

            var oProject = oModel.getProperty("/project");

            var bValid = oProject.title &&
                oProject.description &&
                oProject.fundingAmount &&
                oProject.duration &&
                oProject.category &&
                oProject.startDate;

            if (bValid) {
                oProjectStep.setValidated(true);
                oModel.setProperty("/canProceed", true);
            } else {
                oProjectStep.setValidated(false);
                oModel.setProperty("/canProceed", false);
            }
        },

        _validateCurrentStep: function (iStepNumber) {
            var oModel = this.getView().getModel();
            switch (iStepNumber) {
                case 0:
                    this._validateProgramStep();
                    break;
                case 1:
                    this._validateApplicantStep();
                    break;
                case 2:
                    this._validateProjectStep();
                    break;
                case 3:
                    oModel.setProperty("/canProceed", false); // Disable Next button
                    this.byId("wizardSubmitButton").setVisible(true); // Ensure button is visible
                    break;
            }
        },

        onTermsChange: function (oEvent) {
            var bSelected = oEvent.getParameter("selected");
            this.getView().getModel().setProperty("/termsAccepted", bSelected);
        },

        onWizardNext: function () {
            var oWizard = this.byId("fundingWizard");
            var oModel = this.getView().getModel();
            var iCurrentStep = oModel.getProperty("/currentStep");
            var aSteps = oWizard.getSteps();
            var oCurrentStep = aSteps[iCurrentStep];
            console.log("Current step before next: ", oCurrentStep ? oCurrentStep.getId() : "undefined", "Index: ", iCurrentStep);

            if (iCurrentStep >= 0 && iCurrentStep < aSteps.length - 1) {
                if (oCurrentStep && oCurrentStep.getValidated()) {
                    oWizard.nextStep();
                    oModel.setProperty("/currentStep", iCurrentStep + 1); // Update current step
                    console.log("After next, currentStep: ", oModel.getProperty("/currentStep"));
                } else {
                    MessageToast.show("Please complete all required fields before proceeding.");
                }
            } else if (iCurrentStep === aSteps.length - 1) {
                MessageToast.show("This is the final step. Please review and submit.");
            }
        },

        onWizardBack: function () {
            var oWizard = this.byId("fundingWizard");
            var oModel = this.getView().getModel();
            var iCurrentStep = oModel.getProperty("/currentStep");
            console.log("Current step before back: ", iCurrentStep);
            if (iCurrentStep > 0) {
                oWizard.previousStep();
                oModel.setProperty("/currentStep", iCurrentStep - 1); // Update current step
                console.log("After back, currentStep: ", oModel.getProperty("/currentStep"));
            }
        },

        onWizardComplete: function () {
            MessageToast.show("All steps completed. Review your application and submit.");
        },

        onSubmitApplication: function () {
            var oModel = this.getView().getModel();
            var oData = oModel.getData();

            MessageBox.confirm(
                "Are you sure you want to submit your funding application?", {
                title: "Confirm Submission",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        this._submitApplication(oData);
                    }
                }.bind(this)
            }
            );
        },

        _submitApplication: function (oData) {
            sap.ui.core.BusyIndicator.show(0);

            setTimeout(function () {
                sap.ui.core.BusyIndicator.hide();

                MessageBox.success(
                    "Your application has been submitted successfully! Reference Number: FA-" + Date.now(), {
                    title: "Application Submitted",
                    onClose: function () {
                        this._resetWizard();
                    }.bind(this)
                }
                );
            }.bind(this), 2000);
        },

        _resetWizard: function () {
            var oWizard = this.byId("fundingWizard");
            var oModel = this.getView().getModel();

            oModel.setData({
                selectedProgram: "",
                programName: "",
                programDescription: "",
                fundingRange: "",
                eligibility: "",
                currentStep: 0,
                canProceed: false,
                termsAccepted: false,
                applicant: {
                    fullName: "",
                    email: "",
                    phone: "",
                    dateOfBirth: "",
                    address: "",
                    city: "",
                    country: "",
                    postalCode: ""
                },
                project: {
                    title: "",
                    description: "",
                    fundingAmount: "",
                    duration: "",
                    category: "",
                    startDate: ""
                }
            });

            oWizard.discardProgress(this.byId("programStep"));
        }
    });
});