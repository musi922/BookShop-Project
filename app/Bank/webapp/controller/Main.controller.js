sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.bank.controller.Main", {

        onInit: function () {
            var oModel = new JSONModel({
                selectedProgram: "",
                programName: "",
                programDescription: "",
                fundingRange: "",
                eligibility: "",
                termsAccepted: false,
                currentStep: 1, // Track current wizard step
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
            this._loadProgramConfigs();
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

        // Program Selection Handlers
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
            var bValid = !!oModel.getProperty("/selectedProgram");
            
            oProgramStep.setValidated(bValid);
        },

        // Applicant Information Handlers
        onApplicantFieldChange: function () {
            this._validateApplicantStep();
        },

        _validateApplicantStep: function () {
            var oModel = this.getView().getModel();
            var oApplicantStep = this.byId("applicantStep");
            var oApplicant = oModel.getProperty("/applicant");

            var bValid = !!(
                oApplicant.fullName &&
                oApplicant.email &&
                oApplicant.phone &&
                oApplicant.dateOfBirth &&
                oApplicant.city &&
                oApplicant.country
            );

            // Email validation
            if (bValid && oApplicant.email) {
                var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                bValid = emailPattern.test(oApplicant.email);
            }

            oApplicantStep.setValidated(bValid);
        },

        // Project Details Handlers
        onProjectFieldChange: function () {
            this._validateProjectStep();
        },

        _validateProjectStep: function () {
            var oModel = this.getView().getModel();
            var oProjectStep = this.byId("projectStep");
            var oProject = oModel.getProperty("/project");

            var bValid = !!(
                oProject.title &&
                oProject.description &&
                oProject.fundingAmount &&
                oProject.duration &&
                oProject.category &&
                oProject.startDate
            );

            oProjectStep.setValidated(bValid);
        },

        // Wizard Navigation
        onStepActivate: function (oEvent) {
            var oModel = this.getView().getModel();
            var iStepNumber = oEvent.getParameter("index");
            
            // Update current step in model
            oModel.setProperty("/currentStep", iStepNumber + 1);
            
            // Validate previous steps when moving forward
            if (iStepNumber > 0) {
                this._validateStepByIndex(iStepNumber - 1);
            }
        },

        _validateStepByIndex: function (iStepNumber) {
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
            }
        },

        onWizardNext: function () {
            var oWizard = this.byId("fundingWizard");
            var oModel = this.getView().getModel();
            var iCurrentStepIndex = oWizard.getProgress() - 1;
            var aSteps = oWizard.getSteps();
            var oCurrentStep = aSteps[iCurrentStepIndex];

            // Revalidate the current step before proceeding
            this._validateStepByIndex(iCurrentStepIndex);

            if (oCurrentStep && oCurrentStep.getValidated()) {
                oWizard.nextStep();
                
                // Update current step in model for button visibility
                var iNewStep = oWizard.getProgress();
                oModel.setProperty("/currentStep", iNewStep);
            } else {
                MessageToast.show("Please complete all required fields before proceeding.");
            }
        },

        onWizardBack: function () {
            var oWizard = this.byId("fundingWizard");
            var oModel = this.getView().getModel();
            oWizard.previousStep();
            
            // Update current step in model for button visibility
            var iCurrentStep = oWizard.getProgress();
            oModel.setProperty("/currentStep", iCurrentStep);
        },

        onWizardComplete: function () {
            // Wizard completed - user is now on review step
        },

        // Terms and Submission
        onTermsChange: function (oEvent) {
            var bSelected = oEvent.getParameter("selected");
            this.getView().getModel().setProperty("/termsAccepted", bSelected);
        },

        onSubmitApplication: function () {
            var oModel = this.getView().getModel();
            
            if (!oModel.getProperty("/termsAccepted")) {
                MessageToast.show("Please accept the terms and conditions to submit.");
                return;
            }

            this._submitApplication(oModel.getData());
        },

        _submitApplication: function (oData) {
            sap.ui.core.BusyIndicator.show(0);

            // Simulate API call
            setTimeout(function () {
                sap.ui.core.BusyIndicator.hide();
                
                var sReferenceNumber = "FA-" + Date.now();
                
                MessageBox.success(
                    "Your application has been submitted successfully!\n\nReference Number: " + sReferenceNumber + 
                    "\n\nYou will receive a confirmation email shortly.", {
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

            // Reset model data
            oModel.setData({
                selectedProgram: "",
                programName: "",
                programDescription: "",
                fundingRange: "",
                eligibility: "",
                termsAccepted: false,
                currentStep: 1,
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

            // Reset wizard to first step
            oWizard.discardProgress(this.byId("programStep"));
        }
    });
});