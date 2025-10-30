sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.bank.controller.Main", {

        onInit: function () {
            // Initialize application data model
            var oModel = new JSONModel({
                selectedProgram: "",
                termsAccepted: false,
                currentStep: 1,
                uploadedDocuments: "None",
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
                },
                documents: {
                    businessPlan: null,
                    financialStatements: null
                }
            });
            this.getView().setModel(oModel);

            // Initialize empty config model
            var oConfigModel = new JSONModel({});
            this.getView().setModel(oConfigModel, "config");

            // Load program list for reference
            this._programList = {
                "startup": "model/programs/startup.json",
                "innovation": "model/programs/innovation.json",
                "sme": "model/programs/sme.json",
                "research": "model/programs/research.json"
            };
        },

        // ==================== PROGRAM SELECTION ====================

        onProgramChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            
            if (!sSelectedKey) {
                this._clearProgramConfig();
                return;
            }

            this._loadProgramConfig(sSelectedKey);
        },

        _loadProgramConfig: function (sProgramKey) {
            var sConfigPath = this._programList[sProgramKey];
            
            if (!sConfigPath) {
                MessageToast.show("Program configuration not found.");
                return;
            }

            // Show loading indicator
            sap.ui.core.BusyIndicator.show(0);

            // Load the JSON configuration file
            var oConfigModel = this.getView().getModel("config");
            oConfigModel.loadData(sConfigPath)
                .then(function () {
                    sap.ui.core.BusyIndicator.hide();
                    
                    var oModel = this.getView().getModel();
                    oModel.setProperty("/selectedProgram", sProgramKey);
                    
                    // Validate the program step after config is loaded
                    this._validateProgramStep();
                    
                    // Reset other steps when program changes
                    this._resetApplicantStep();
                    this._resetProjectStep();
                    
                    MessageToast.show("Program configuration loaded successfully.");
                }.bind(this))
                .catch(function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load program configuration: " + oError.message);
                }.bind(this));
        },

        _clearProgramConfig: function () {
            var oConfigModel = this.getView().getModel("config");
            oConfigModel.setData({});
            
            var oModel = this.getView().getModel();
            oModel.setProperty("/selectedProgram", "");
            
            this._validateProgramStep();
        },

        _validateProgramStep: function () {
            var oModel = this.getView().getModel();
            var oProgramStep = this.byId("programStep");
            var bValid = !!oModel.getProperty("/selectedProgram");
            
            oProgramStep.setValidated(bValid);
        },

        // ==================== APPLICANT INFORMATION ====================

        onApplicantFieldChange: function () {
            this._validateApplicantStep();
        },

        _validateApplicantStep: function () {
            var oModel = this.getView().getModel();
            var oConfigModel = this.getView().getModel("config");
            var oApplicantStep = this.byId("applicantStep");
            var oApplicant = oModel.getProperty("/applicant");
            var oFieldsConfig = oConfigModel.getProperty("/steps/applicantInfo/fields");

            if (!oFieldsConfig) {
                oApplicantStep.setValidated(false);
                return;
            }

            var bValid = true;

            // Check each field based on its configuration
            for (var sFieldName in oFieldsConfig) {
                var oFieldConfig = oFieldsConfig[sFieldName];
                
                // Only validate if field is visible and required
                if (oFieldConfig.visible && oFieldConfig.required) {
                    var sValue = oApplicant[sFieldName];
                    
                    if (!sValue || sValue.trim() === "") {
                        bValid = false;
                        break;
                    }
                }
            }

            // Email validation if email is visible and has a value
            if (bValid && oFieldsConfig.email && oFieldsConfig.email.visible && oApplicant.email) {
                var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                bValid = emailPattern.test(oApplicant.email);
            }

            oApplicantStep.setValidated(bValid);
        },

        _resetApplicantStep: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/applicant", {
                fullName: "",
                email: "",
                phone: "",
                dateOfBirth: "",
                address: "",
                city: "",
                country: "",
                postalCode: ""
            });
            
            var oApplicantStep = this.byId("applicantStep");
            oApplicantStep.setValidated(false);
        },

        // ==================== PROJECT DETAILS ====================

        onProjectFieldChange: function () {
            this._validateProjectStep();
        },

        _validateProjectStep: function () {
            var oModel = this.getView().getModel();
            var oConfigModel = this.getView().getModel("config");
            var oProjectStep = this.byId("projectStep");
            var oProject = oModel.getProperty("/project");
            var oFieldsConfig = oConfigModel.getProperty("/steps/projectDetails/fields");
            var oDocumentsConfig = oConfigModel.getProperty("/steps/projectDetails/documents");

            if (!oFieldsConfig) {
                oProjectStep.setValidated(false);
                return;
            }

            var bValid = true;

            // Check project fields
            for (var sFieldName in oFieldsConfig) {
                var oFieldConfig = oFieldsConfig[sFieldName];
                
                if (oFieldConfig.visible && oFieldConfig.required) {
                    var sValue = oProject[sFieldName];
                    
                    if (!sValue || (typeof sValue === "string" && sValue.trim() === "")) {
                        bValid = false;
                        break;
                    }

                    // Check min length for description
                    if (sFieldName === "description" && oFieldConfig.minLength) {
                        if (sValue.length < oFieldConfig.minLength) {
                            bValid = false;
                            break;
                        }
                    }

                    // Check max value for duration
                    if (sFieldName === "duration" && oFieldConfig.max) {
                        if (parseInt(sValue) > oFieldConfig.max) {
                            bValid = false;
                            break;
                        }
                    }
                }
            }

            // Validate funding amount is within range
            if (bValid && oProject.fundingAmount) {
                var iFundingAmount = parseInt(oProject.fundingAmount);
                var oFundingRange = oConfigModel.getProperty("/fundingRange");
                
                if (oFundingRange) {
                    if (iFundingAmount < oFundingRange.min || iFundingAmount > oFundingRange.max) {
                        bValid = false;
                    }
                }
            }

            // Check required documents
            if (bValid && oDocumentsConfig) {
                var oDocuments = oModel.getProperty("/documents");
                
                // Check business plan
                if (oDocumentsConfig.businessPlan && oDocumentsConfig.businessPlan.required) {
                    var oBusinessPlanUpload = this.byId("businessPlanUpload");
                    if (oBusinessPlanUpload && oBusinessPlanUpload.getItems().length === 0) {
                        bValid = false;
                    }
                }

                // Check financial statements
                if (oDocumentsConfig.financialStatements && oDocumentsConfig.financialStatements.required) {
                    var oFinancialUpload = this.byId("financialUpload");
                    if (oFinancialUpload && oFinancialUpload.getItems().length === 0) {
                        bValid = false;
                    }
                }
            }

            oProjectStep.setValidated(bValid);
        },

        _resetProjectStep: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/project", {
                title: "",
                description: "",
                fundingAmount: "",
                duration: "",
                category: "",
                startDate: ""
            });
            oModel.setProperty("/documents", {
                businessPlan: null,
                financialStatements: null
            });
            
            // Clear upload sets
            var oBusinessPlanUpload = this.byId("businessPlanUpload");
            if (oBusinessPlanUpload) {
                oBusinessPlanUpload.removeAllItems();
            }
            
            var oFinancialUpload = this.byId("financialUpload");
            if (oFinancialUpload) {
                oFinancialUpload.removeAllItems();
            }
            
            var oProjectStep = this.byId("projectStep");
            oProjectStep.setValidated(false);
        },

        // ==================== FILE UPLOAD HANDLERS ====================

        onFileUploaded: function (oEvent) {
            this._updateUploadedDocumentsList();
            this._validateProjectStep();
        },

        onFileRemoved: function (oEvent) {
            this._updateUploadedDocumentsList();
            this._validateProjectStep();
        },

        _updateUploadedDocumentsList: function () {
            var aDocuments = [];
            
            var oBusinessPlanUpload = this.byId("businessPlanUpload");
            if (oBusinessPlanUpload && oBusinessPlanUpload.getItems().length > 0) {
                aDocuments.push("Business Plan");
            }
            
            var oFinancialUpload = this.byId("financialUpload");
            if (oFinancialUpload && oFinancialUpload.getItems().length > 0) {
                aDocuments.push("Financial Statements");
            }
            
            var sDocumentsList = aDocuments.length > 0 ? aDocuments.join(", ") : "None";
            this.getView().getModel().setProperty("/uploadedDocuments", sDocumentsList);
        },

        // ==================== WIZARD NAVIGATION ====================

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
                this._showValidationErrorMessage(iCurrentStepIndex);
            }
        },

        _showValidationErrorMessage: function (iStepIndex) {
            var oConfigModel = this.getView().getModel("config");
            var sMessage = "Please complete all required fields before proceeding.";

            switch (iStepIndex) {
                case 0:
                    sMessage = "Please select a funding program.";
                    break;
                case 1:
                    sMessage = "Please fill in all required applicant information fields.";
                    break;
                case 2:
                    var oFieldsConfig = oConfigModel.getProperty("/steps/projectDetails/fields");
                    var oDocumentsConfig = oConfigModel.getProperty("/steps/projectDetails/documents");
                    
                    // Build detailed error message
                    var aErrors = [];
                    
                    if (oFieldsConfig) {
                        var oModel = this.getView().getModel();
                        var oProject = oModel.getProperty("/project");
                        
                        // Check description length
                        if (oFieldsConfig.description && oFieldsConfig.description.minLength) {
                            if (!oProject.description || oProject.description.length < oFieldsConfig.description.minLength) {
                                aErrors.push("Description must be at least " + oFieldsConfig.description.minLength + " characters");
                            }
                        }
                        
                        // Check duration
                        if (oFieldsConfig.duration && oFieldsConfig.duration.max) {
                            if (oProject.duration && parseInt(oProject.duration) > oFieldsConfig.duration.max) {
                                aErrors.push("Duration cannot exceed " + oFieldsConfig.duration.max + " months");
                            }
                        }
                        
                        // Check funding amount
                        if (oProject.fundingAmount) {
                            var oFundingRange = oConfigModel.getProperty("/fundingRange");
                            var iFunding = parseInt(oProject.fundingAmount);
                            if (oFundingRange && (iFunding < oFundingRange.min || iFunding > oFundingRange.max)) {
                                aErrors.push("Funding amount must be between " + oFundingRange.min + " and " + oFundingRange.max);
                            }
                        }
                    }
                    
                    // Check documents
                    if (oDocumentsConfig) {
                        if (oDocumentsConfig.businessPlan && oDocumentsConfig.businessPlan.required) {
                            var oBusinessPlanUpload = this.byId("businessPlanUpload");
                            if (!oBusinessPlanUpload || oBusinessPlanUpload.getItems().length === 0) {
                                aErrors.push("Business Plan document is required");
                            }
                        }
                        
                        if (oDocumentsConfig.financialStatements && oDocumentsConfig.financialStatements.required) {
                            var oFinancialUpload = this.byId("financialUpload");
                            if (!oFinancialUpload || oFinancialUpload.getItems().length === 0) {
                                aErrors.push("Financial Statements document is required");
                            }
                        }
                    }
                    
                    if (aErrors.length > 0) {
                        sMessage = "Please fix the following issues:\n\n• " + aErrors.join("\n• ");
                    } else {
                        sMessage = "Please complete all required project details.";
                    }
                    break;
            }

            MessageBox.warning(sMessage);
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

        // ==================== TERMS AND SUBMISSION ====================

        onTermsChange: function (oEvent) {
            var bSelected = oEvent.getParameter("selected");
            this.getView().getModel().setProperty("/termsAccepted", bSelected);
        },

        onSubmitApplication: function () {
            var oModel = this.getView().getModel();
            var oConfigModel = this.getView().getModel("config");
            
            if (!oModel.getProperty("/termsAccepted")) {
                MessageToast.show("Please accept the terms and conditions to submit.");
                return;
            }

            // Prepare submission data
            var oSubmissionData = {
                program: oConfigModel.getData(),
                applicant: oModel.getProperty("/applicant"),
                project: oModel.getProperty("/project"),
                documents: this._getUploadedDocumentsList(),
                submissionDate: new Date().toISOString()
            };

            this._submitApplication(oSubmissionData);
        },

        _getUploadedDocumentsList: function () {
            var aDocuments = [];
            
            var oBusinessPlanUpload = this.byId("businessPlanUpload");
            if (oBusinessPlanUpload) {
                oBusinessPlanUpload.getItems().forEach(function (oItem) {
                    aDocuments.push({
                        type: "businessPlan",
                        fileName: oItem.getFileName()
                    });
                });
            }
            
            var oFinancialUpload = this.byId("financialUpload");
            if (oFinancialUpload) {
                oFinancialUpload.getItems().forEach(function (oItem) {
                    aDocuments.push({
                        type: "financialStatements",
                        fileName: oItem.getFileName()
                    });
                });
            }
            
            return aDocuments;
        },

        _submitApplication: function (oData) {
            sap.ui.core.BusyIndicator.show(0);

            // Simulate API call
            setTimeout(function () {
                sap.ui.core.BusyIndicator.hide();
                
                var sReferenceNumber = "FA-" + oData.program.programId.toUpperCase() + "-" + Date.now();
                var sProcessingTime = oData.program.processingTime.value + " " + oData.program.processingTime.unit;
                
                MessageBox.success(
                    "Your application has been submitted successfully!\n\n" +
                    "Reference Number: " + sReferenceNumber + "\n" +
                    "Program: " + oData.program.programName + "\n" +
                    "Processing Time: " + sProcessingTime + "\n\n" +
                    "You will receive a confirmation email shortly.", {
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
            var oConfigModel = this.getView().getModel("config");

            // Reset data model
            oModel.setData({
                selectedProgram: "",
                termsAccepted: false,
                currentStep: 1,
                uploadedDocuments: "None",
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
                },
                documents: {
                    businessPlan: null,
                    financialStatements: null
                }
            });

            // Reset config model
            oConfigModel.setData({});

            // Clear upload sets
            var oBusinessPlanUpload = this.byId("businessPlanUpload");
            if (oBusinessPlanUpload) {
                oBusinessPlanUpload.removeAllItems();
            }
            
            var oFinancialUpload = this.byId("financialUpload");
            if (oFinancialUpload) {
                oFinancialUpload.removeAllItems();
            }

            // Reset wizard to first step
            oWizard.discardProgress(this.byId("programStep"));
            },

            // Add these functions to your Main.controller.js

// ==================== DOWNLOAD FUNCTIONS ====================

onDownloadPDF: function () {
    var oModel = this.getView().getModel();
    var oConfigModel = this.getView().getModel("config");
    
    try {
        // Prepare data for PDF
        var oData = this._prepareDownloadData();
        
        // Log the data we're about to download
        console.log("=== PDF Download Data ===");
        console.log("Complete Data Object:", JSON.stringify(oData, null, 2));
        console.log("Config Data:", JSON.stringify(oConfigModel.getData(), null, 2));
        console.log("========================");
        
        // Create PDF content
        var sPdfContent = this._generatePDFContent(oData, oConfigModel.getData());
        
        console.log("=== Generated PDF Content ===");
        console.log(sPdfContent);
        console.log("============================");
        
        // Download as plain text file for now (change extension to .txt for testing)
        this._downloadFile(sPdfContent, "funding-application.txt", "text/plain");
        
        MessageToast.show("Application downloaded as text file (PDF generation requires jsPDF library)");
    } catch (error) {
        console.error("PDF Generation Error:", error);
        MessageBox.error("Failed to generate PDF: " + error.message);
    }
},

onDownloadExcel: function () {
    var oModel = this.getView().getModel();
    var oConfigModel = this.getView().getModel("config");
    
    try {
        // Prepare data for Excel
        var oData = this._prepareDownloadData();
        
        // Log the data we're about to download
        console.log("=== Excel Download Data ===");
        console.log("Complete Data Object:", JSON.stringify(oData, null, 2));
        console.log("Config Data:", JSON.stringify(oConfigModel.getData(), null, 2));
        console.log("==========================");
        
        // Create Excel content (CSV format for simplicity)
        var sExcelContent = this._generateExcelContent(oData, oConfigModel.getData());
        
        console.log("=== Generated CSV Content ===");
        console.log(sExcelContent);
        console.log("============================");
        
        // Download as CSV (change extension to .csv for proper compatibility)
        this._downloadFile(sExcelContent, "funding-application.csv", "text/csv");
        
        MessageToast.show("Application downloaded as CSV (Excel compatible)");
    } catch (error) {
        console.error("Excel Generation Error:", error);
        MessageBox.error("Failed to generate Excel: " + error.message);
    }
},

_prepareDownloadData: function () {
    var oModel = this.getView().getModel();
    var oConfigModel = this.getView().getModel("config");
    
    return {
        program: {
            name: oConfigModel.getProperty("/programName") || "",
            id: oConfigModel.getProperty("/programId") || "",
            fundingRange: oConfigModel.getProperty("/fundingRange") || {},
            processingTime: oConfigModel.getProperty("/processingTime") || {}
        },
        applicant: oModel.getProperty("/applicant") || {},
        project: oModel.getProperty("/project") || {},
        documents: oModel.getProperty("/uploadedDocuments") || "None",
        submissionDate: new Date().toLocaleString()
    };
},

_generatePDFContent: function (oData, oConfig) {
    // Simple text-based PDF content
    // In production, use jsPDF library for proper PDF generation
    var aContent = [];
    
    aContent.push("FUNDING APPLICATION");
    aContent.push("===================\n");
    
    aContent.push("Generated: " + oData.submissionDate);
    aContent.push("\n");
    
    // Program Information
    aContent.push("PROGRAM INFORMATION");
    aContent.push("-------------------");
    aContent.push("Program: " + oData.program.name);
    aContent.push("Program ID: " + oData.program.id);
    if (oData.program.fundingRange) {
        aContent.push("Funding Range: " + oData.program.fundingRange.min + " - " + 
                     oData.program.fundingRange.max + " " + oData.program.fundingRange.currency);
    }
    if (oData.program.processingTime) {
        aContent.push("Processing Time: " + oData.program.processingTime.value + " " + 
                     oData.program.processingTime.unit);
    }
    aContent.push("\n");
    
    // Applicant Information
    if (oConfig.steps && oConfig.steps.applicantInfo && oConfig.steps.applicantInfo.enabled) {
        aContent.push("APPLICANT INFORMATION");
        aContent.push("---------------------");
        if (oData.applicant.fullName) aContent.push("Full Name: " + oData.applicant.fullName);
        if (oData.applicant.email) aContent.push("Email: " + oData.applicant.email);
        if (oData.applicant.phone) aContent.push("Phone: " + oData.applicant.phone);
        if (oData.applicant.dateOfBirth) aContent.push("Date of Birth: " + oData.applicant.dateOfBirth);
        if (oData.applicant.address) aContent.push("Address: " + oData.applicant.address);
        if (oData.applicant.city) aContent.push("City: " + oData.applicant.city);
        if (oData.applicant.country) aContent.push("Country: " + oData.applicant.country);
        if (oData.applicant.postalCode) aContent.push("Postal Code: " + oData.applicant.postalCode);
        aContent.push("\n");
    }
    
    // Project Information
    if (oConfig.steps && oConfig.steps.projectDetails && oConfig.steps.projectDetails.enabled) {
        aContent.push("PROJECT DETAILS");
        aContent.push("---------------");
        if (oData.project.title) aContent.push("Project Title: " + oData.project.title);
        if (oData.project.description) aContent.push("Description: " + oData.project.description);
        if (oData.project.fundingAmount) aContent.push("Funding Amount: " + oData.project.fundingAmount + " RWF");
        if (oData.project.duration) aContent.push("Duration: " + oData.project.duration + " months");
        if (oData.project.category) aContent.push("Category: " + oData.project.category);
        if (oData.project.startDate) aContent.push("Start Date: " + oData.project.startDate);
        aContent.push("Documents: " + oData.documents);
        aContent.push("\n");
    }
    
    return aContent.join("\n");
},

_generateExcelContent: function (oData, oConfig) {
    // Generate CSV format (compatible with Excel)
    var aRows = [];
    
    // Header
    aRows.push(["FUNDING APPLICATION"]);
    aRows.push([]);
    aRows.push(["Generated:", oData.submissionDate]);
    aRows.push([]);
    
    // Program Information
    aRows.push(["PROGRAM INFORMATION"]);
    aRows.push(["Program", oData.program.name]);
    aRows.push(["Program ID", oData.program.id]);
    if (oData.program.fundingRange) {
        aRows.push(["Funding Range", oData.program.fundingRange.min + " - " + 
                   oData.program.fundingRange.max + " " + oData.program.fundingRange.currency]);
    }
    if (oData.program.processingTime) {
        aRows.push(["Processing Time", oData.program.processingTime.value + " " + 
                   oData.program.processingTime.unit]);
    }
    aRows.push([]);
    
    // Applicant Information
    if (oConfig.steps && oConfig.steps.applicantInfo && oConfig.steps.applicantInfo.enabled) {
        aRows.push(["APPLICANT INFORMATION"]);
        if (oData.applicant.fullName) aRows.push(["Full Name", oData.applicant.fullName]);
        if (oData.applicant.email) aRows.push(["Email", oData.applicant.email]);
        if (oData.applicant.phone) aRows.push(["Phone", oData.applicant.phone]);
        if (oData.applicant.dateOfBirth) aRows.push(["Date of Birth", oData.applicant.dateOfBirth]);
        if (oData.applicant.address) aRows.push(["Address", oData.applicant.address]);
        if (oData.applicant.city) aRows.push(["City", oData.applicant.city]);
        if (oData.applicant.country) aRows.push(["Country", oData.applicant.country]);
        if (oData.applicant.postalCode) aRows.push(["Postal Code", oData.applicant.postalCode]);
        aRows.push([]);
    }
    
    // Project Information
    if (oConfig.steps && oConfig.steps.projectDetails && oConfig.steps.projectDetails.enabled) {
        aRows.push(["PROJECT DETAILS"]);
        if (oData.project.title) aRows.push(["Project Title", oData.project.title]);
        if (oData.project.description) aRows.push(["Description", oData.project.description]);
        if (oData.project.fundingAmount) aRows.push(["Funding Amount", oData.project.fundingAmount + " RWF"]);
        if (oData.project.duration) aRows.push(["Duration", oData.project.duration + " months"]);
        if (oData.project.category) aRows.push(["Category", oData.project.category]);
        if (oData.project.startDate) aRows.push(["Start Date", oData.project.startDate]);
        aRows.push(["Documents", oData.documents]);
    }
    
    // Convert to CSV
    var sCsv = aRows.map(function(row) {
        return row.map(function(cell) {
            var cellStr = cell || "";
            // Escape quotes and wrap in quotes if contains comma or quote
            if (cellStr.toString().indexOf(",") > -1 || cellStr.toString().indexOf('"') > -1) {
                cellStr = '"' + cellStr.toString().replace(/"/g, '""') + '"';
            }
            return cellStr;
        }).join(",");
    }).join("\n");
    
    return sCsv;
},

_downloadFile: function (sContent, sFileName, sMimeType) {
    // Create blob
    var blob = new Blob([sContent], { type: sMimeType });
    
    // Create download link
    var link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = sFileName;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
}

        });
});