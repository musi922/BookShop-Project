sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (Controller, MessageToast, MessageBox, JSONModel, Fragment) {
    "use strict";

    return Controller.extend("com.study.controller.Books", {
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteBooks").attachPatternMatched(this._onRouteMatched, this);

            // Initialize model for new book data
            this.getView().setModel(new JSONModel({
                title: "",
                author_ID: "",
                price: null,
                stock: null
            }), "newBook");

            // Initialize upload model
            this._initUploadModel();

            // Initialize notification model
            this._initNotificationModel();

            // Wait for the model to be available before loading notifications
            var oModel = this.getOwnerComponent().getModel();
            if (oModel) {
                // Model is already available
                oModel.metadataLoaded().then(function() {
                    this._loadNotifications();
                    this._startNotificationRefresh();
                }.bind(this));
            } else {
                // Wait for model to be set
                this.getOwnerComponent().getModel().attachMetadataLoaded(function() {
                    this._loadNotifications();
                    this._startNotificationRefresh();
                }.bind(this));
            }
        },
        onAuthorNavigate: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("authors")
        },


        _startNotificationRefresh: function() {
            // Set up auto-refresh for notifications every 30 seconds
            if (!this._notificationRefreshInterval) {
                this._notificationRefreshInterval = setInterval(function() {
                    this._loadNotifications();
                }.bind(this), 30000);
            }
        },

        _initNotificationModel: function () {
            var oNotificationModel = new JSONModel({
                notifications: [],
                unreadCount: 0
            });
            this.getView().setModel(oNotificationModel, "notificationModel");
        },

        _loadNotifications: function () {
            var oModel = this.getView().getModel();
            var oNotificationModel = this.getView().getModel("notificationModel");

            // Check if model exists
            if (!oModel) {
                console.warn("OData model not available yet");
                return;
            }

            // Read notifications ordered by creation date (newest first)
            oModel.read("/Notifications", {
                urlParameters: {
                    "$orderby": "createdAt desc",
                    "$top": "50"
                },
                success: function (oData) {
                    var aNotifications = oData.results || [];
                    var iUnreadCount = aNotifications.filter(function(n) {
                        return !n.isRead;
                    }).length;

                    oNotificationModel.setProperty("/notifications", aNotifications);
                    oNotificationModel.setProperty("/unreadCount", iUnreadCount);

                    // Update badge on button
                    this._updateNotificationBadge(iUnreadCount);
                }.bind(this),
                error: function (oError) {
                    console.error("Failed to load notifications:", oError);
                    // Don't show error to user on initial load
                }
            });
        },

        _updateNotificationBadge: function (iCount) {
            var oButton = this.byId("notificationBtn");
            if (oButton) {
                var oDomRef = oButton.getDomRef();
                if (oDomRef) {
                    oDomRef.setAttribute("data-badge", iCount > 0 ? iCount : "0");
                }
            }
        },

        onOpenNotifications: function (oEvent) {
            var oButton = oEvent.getSource();
            var oView = this.getView();

            if (!this._pNotificationPopover) {
                this._pNotificationPopover = Fragment.load({
                    id: oView.getId(),
                    name: "com.study.view.NotificationsPopover",
                    controller: this
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            this._pNotificationPopover.then(function (oPopover) {
                // Refresh notifications before opening
                this._loadNotifications();
                
                if (oPopover.isOpen()) {
                    oPopover.close();
                } else {
                    oPopover.openBy(oButton);
                }
            }.bind(this));
        },

        onNotificationPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var sNotificationId = oItem.data("notificationId");
            var sRelatedEntity = oItem.data("relatedEntity");
            var sRelatedEntityId = oItem.data("relatedEntityId");

            // Mark as read
            this._markNotificationAsRead(sNotificationId);

            // Navigate to related entity if applicable
            if (sRelatedEntity === "Books" && sRelatedEntityId) {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("bookDetail", {
                    bookId: sRelatedEntityId
                });
                
                // Close popover
                this.byId("notificationsPopover").close();
            }
        },

        onNotificationClose: function (oEvent) {
            var oItem = oEvent.getSource();
            var sNotificationId = oItem.data("notificationId");

            // Delete notification
            this._deleteNotification(sNotificationId);
        },

        _markNotificationAsRead: function (sNotificationId) {
            var oModel = this.getView().getModel();

            oModel.update("/Notifications('" + sNotificationId + "')", {
                isRead: true
            }, {
                success: function () {
                    this._loadNotifications();
                }.bind(this),
                error: function (oError) {
                    console.error("Failed to mark notification as read:", oError);
                }
            });
        },

        _deleteNotification: function (sNotificationId) {
            var oModel = this.getView().getModel();

            oModel.remove("/Notifications('" + sNotificationId + "')", {
                success: function () {
                    this._loadNotifications();
                    MessageToast.show("Notification removed");
                }.bind(this),
                error: function (oError) {
                    MessageBox.error("Failed to delete notification");
                }
            });
        },

        onMarkAllAsRead: function () {
            var oModel = this.getView().getModel();
            var aNotifications = this.getView().getModel("notificationModel").getProperty("/notifications");
            var aUnread = aNotifications.filter(function(n) { return !n.isRead; });

            if (aUnread.length === 0) {
                MessageToast.show("No unread notifications");
                return;
            }

            var iProcessed = 0;
            
            aUnread.forEach(function(oNotification) {
                oModel.update("/Notifications('" + oNotification.ID + "')", {
                    isRead: true
                }, {
                    success: function () {
                        iProcessed++;
                        if (iProcessed === aUnread.length) {
                            this._loadNotifications();
                            MessageToast.show("All notifications marked as read");
                        }
                    }.bind(this)
                });
            }.bind(this));
        },

        onClearAllNotifications: function () {
            var that = this;
            
            MessageBox.confirm("Are you sure you want to delete all notifications?", {
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        that._clearAllNotifications();
                    }
                }
            });
        },

        _clearAllNotifications: function () {
            var oModel = this.getView().getModel();
            var aNotifications = this.getView().getModel("notificationModel").getProperty("/notifications");

            if (aNotifications.length === 0) {
                MessageToast.show("No notifications to clear");
                return;
            }

            var iProcessed = 0;
            
            aNotifications.forEach(function(oNotification) {
                oModel.remove("/Notifications('" + oNotification.ID + "')", {
                    success: function () {
                        iProcessed++;
                        if (iProcessed === aNotifications.length) {
                            this._loadNotifications();
                            MessageToast.show("All notifications cleared");
                        }
                    }.bind(this)
                });
            }.bind(this));
        },

        formatNotificationPriority: function (sPriority) {
            var mPriorityMap = {
                "urgent": "High",
                "high": "High",
                "normal": "Medium",
                "low": "Low"
            };
            return mPriorityMap[sPriority] || "Medium";
        },

        _initUploadModel: function () {
            var oUploadModel = new JSONModel({
                uploadType: "excel",
                allowMultiple: false,
                allowedTypes: ["xlsx", "xls"],
                mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"],
                maxFileSize: 10, // MB
                uploadUrl: "/odata/v2/study/uploadBooks", // Backend endpoint
                instructions: "Upload Excel file with columns: title, author_ID, price, stock",
                uploadButtonText: "Upload & Create Books",
                files: [],
                hasFiles: false,
                uploading: false,
                uploadProgress: 0,
                uploadProgressText: "0%",
                showResults: false,
                resultMessage: "",
                resultType: "Information",
                previewData: []
            });
            this.getView().setModel(oUploadModel, "uploadModel");
        },

        _onRouteMatched: function () {
            var oSmartTable = this.byId("booksSmartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable();
            }
            
            // Reload notifications when route matches
            this._loadNotifications();
        },

        onBeforeRebindTable: function (oEvent) {
            // Custom filters can be added here if needed
        },

        onSelectionChange: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            if (oItem) {
                var oContext = oItem.getBindingContext();
                var oBook = oContext.getObject();

                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("bookDetail", {
                    bookId: oBook.ID
                });
            }
        },

        onItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var oBook = oContext.getObject();

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("bookDetail", {
                bookId: oBook.ID
            });
        },

        // ========== UPLOAD DIALOG ==========
        onOpenUploadDialog: function () {
            var oView = this.getView();

            if (!this._pUploadDialog) {
                this._pUploadDialog = Fragment.load({
                    id: oView.getId(),
                    name: "com.study.view.UploadDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pUploadDialog.then(function (oDialog) {
                // Reset upload model
                this._resetUploadModel();
                oDialog.open();
            }.bind(this));
        },

        onCloseUploadDialog: function () {
            this.byId("uploadDialog").close();
            this._resetUploadModel();
        },

        _resetUploadModel: function () {
            var oModel = this.getView().getModel("uploadModel");
            oModel.setProperty("/files", []);
            oModel.setProperty("/hasFiles", false);
            oModel.setProperty("/uploading", false);
            oModel.setProperty("/uploadProgress", 0);
            oModel.setProperty("/showResults", false);
            oModel.setProperty("/previewData", []);

            // Reset file uploader
            var oFileUploader = this.byId("fileUploader");
            if (oFileUploader) {
                oFileUploader.clear();
            }
        },

        onUploadTypeChange: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            var oModel = this.getView().getModel("uploadModel");

            switch (sKey) {
                case "excel":
                    oModel.setProperty("/allowMultiple", false);
                    oModel.setProperty("/allowedTypes", ["xlsx", "xls"]);
                    oModel.setProperty("/mimeTypes", ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"]);
                    oModel.setProperty("/maxFileSize", 10);
                    oModel.setProperty("/instructions", "Upload Excel file with columns: title, author_ID, price, stock");
                    oModel.setProperty("/uploadButtonText", "Upload & Create Books");
                    oModel.setProperty("/uploadUrl", "/odata/v2/study/uploadBooks");
                    break;
                case "document":
                    oModel.setProperty("/allowMultiple", true);
                    oModel.setProperty("/allowedTypes", ["pdf", "doc", "docx", "txt"]);
                    oModel.setProperty("/mimeTypes", ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]);
                    oModel.setProperty("/maxFileSize", 20);
                    oModel.setProperty("/instructions", "Upload PDF, Word, or text documents (Max 20MB)");
                    oModel.setProperty("/uploadButtonText", "Upload Documents");
                    oModel.setProperty("/uploadUrl", "/odata/v2/study/uploadDocuments");
                    break;
                case "image":
                    oModel.setProperty("/allowMultiple", true);
                    oModel.setProperty("/allowedTypes", ["jpg", "jpeg", "png", "gif"]);
                    oModel.setProperty("/mimeTypes", ["image/jpeg", "image/png", "image/gif"]);
                    oModel.setProperty("/maxFileSize", 5);
                    oModel.setProperty("/instructions", "Upload images (JPG, PNG, GIF - Max 5MB each)");
                    oModel.setProperty("/uploadButtonText", "Upload Images");
                    oModel.setProperty("/uploadUrl", "/odata/v2/study/uploadImages");
                    break;
            }

            this._resetUploadModel();
        },

        onFileChange: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var aFiles = oEvent.getParameter("files");
            var oModel = this.getView().getModel("uploadModel");
            var sUploadType = oModel.getProperty("/uploadType");

            if (!aFiles || aFiles.length === 0) {
                oModel.setProperty("/hasFiles", false);
                return;
            }

            var aFileData = [];

            for (var i = 0; i < aFiles.length; i++) {
                var oFile = aFiles[i];
                var sFileSize = this._formatFileSize(oFile.size);
                var sIcon = this._getFileIcon(oFile.name);

                aFileData.push({
                    name: oFile.name,
                    size: sFileSize,
                    icon: sIcon,
                    index: i,
                    file: oFile
                });
            }

            oModel.setProperty("/files", aFileData);
            oModel.setProperty("/hasFiles", true);

            // If Excel, try to parse and preview
            if (sUploadType === "excel" && aFiles.length > 0) {
                this._parseExcelFile(aFiles[0]);
            }
        },

        _parseExcelFile: function (oFile) {
            var oModel = this.getView().getModel("uploadModel");

            // Check if XLSX library is available
            if (typeof XLSX === "undefined") {
                MessageBox.warning("Excel preview not available. You can still upload the file.");
                return;
            }

            var reader = new FileReader();

            reader.onload = function (e) {
                try {
                    var data = new Uint8Array(e.target.result);
                    var workbook = XLSX.read(data, { type: 'array' });
                    var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    var jsonData = XLSX.utils.sheet_to_json(firstSheet);

                    // Validate and prepare preview data
                    var aPreviewData = [];
                    var iPreviewLimit = Math.min(5, jsonData.length);

                    for (var i = 0; i < iPreviewLimit; i++) {
                        var oRow = jsonData[i];
                        var bValid = this._validateBookRow(oRow);

                        aPreviewData.push({
                            title: oRow.title || "",
                            author_ID: oRow.author_ID || "",
                            price: oRow.price || "",
                            stock: oRow.stock || "",
                            status: bValid ? "Valid" : "Invalid",
                            statusState: bValid ? "Success" : "Error"
                        });
                    }

                    oModel.setProperty("/previewData", aPreviewData);

                    if (jsonData.length > 5) {
                        MessageToast.show("Showing first 5 of " + jsonData.length + " rows");
                    }

                } catch (error) {
                    MessageBox.error("Failed to parse Excel file: " + error.message);
                }
            }.bind(this);

            reader.onerror = function () {
                MessageBox.error("Failed to read file");
            };

            reader.readAsArrayBuffer(oFile);
        },

        _validateBookRow: function (oRow) {
            return oRow.title &&
                oRow.author_ID &&
                oRow.price &&
                !isNaN(parseFloat(oRow.price)) &&
                oRow.stock !== undefined &&
                !isNaN(parseInt(oRow.stock));
        },

        onStartUpload: function () {
            var oModel = this.getView().getModel("uploadModel");
            var sUploadType = oModel.getProperty("/uploadType");

            // Show uploading state
            oModel.setProperty("/uploading", true);
            oModel.setProperty("/uploadProgress", 0);
            oModel.setProperty("/showResults", false);

            if (sUploadType === "excel") {
                this._handleExcelUpload();
            } else {
                this._handleFileUpload();
            }
        },

        _handleExcelUpload: function () {
            var oFileUploader = this.byId("fileUploader");
            var oFile = oFileUploader.oFileUpload.files[0];

            if (!oFile) {
                MessageBox.error("Please select a file");
                return;
            }

            var reader = new FileReader();
            var oModel = this.getView().getModel("uploadModel");

            reader.onload = function (e) {
                try {
                    var data = new Uint8Array(e.target.result);
                    var workbook = XLSX.read(data, { type: 'array' });
                    var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    var jsonData = XLSX.utils.sheet_to_json(firstSheet);

                    // Process books
                    this._createBooksFromExcel(jsonData);

                } catch (error) {
                    oModel.setProperty("/uploading", false);
                    MessageBox.error("Failed to process Excel file: " + error.message);
                }
            }.bind(this);

            reader.onerror = function () {
                oModel.setProperty("/uploading", false);
                MessageBox.error("Failed to read file");
            };

            reader.readAsArrayBuffer(oFile);
        },

        _createBooksFromExcel: function (aData) {
            var oMainModel = this.getView().getModel();
            var oUploadModel = this.getView().getModel("uploadModel");

            var iTotal = aData.length;
            var iSuccess = 0;
            var iError = 0;
            var aErrors = [];

            var fnProcessNext = function (index) {
                if (index >= iTotal) {
                    // All done
                    oUploadModel.setProperty("/uploading", false);
                    oUploadModel.setProperty("/uploadProgress", 100);

                    var sMessage = iSuccess + " book(s) created successfully";
                    if (iError > 0) {
                        sMessage += ", " + iError + " failed";
                    }

                    // Refresh table
                    var oSmartTable = this.byId("booksSmartTable");
                    if (oSmartTable) {
                        oSmartTable.rebindTable();
                    }

                    // Reload notifications to see new book notifications
                    this._loadNotifications();

                    if (iError === 0) {
                        MessageToast.show(sMessage);
                        this.onCloseUploadDialog();
                    } else {
                        // Some errors - show details first, then close
                        MessageBox.warning(
                            sMessage + "\n\nErrors:\n" + aErrors.slice(0, 5).join("\n") +
                            (aErrors.length > 5 ? "\n... and " + (aErrors.length - 5) + " more" : ""),
                            {
                                title: "Upload Complete",
                                onClose: function () {
                                    this.onCloseUploadDialog();
                                }.bind(this)
                            }
                        );
                    }

                    return;
                }

                var oRow = aData[index];
                var iProgress = Math.round((index / iTotal) * 100);
                oUploadModel.setProperty("/uploadProgress", iProgress);
                oUploadModel.setProperty("/uploadProgressText", iProgress + "% (" + (index + 1) + "/" + iTotal + ")");

                // Validate row
                if (!this._validateBookRow(oRow)) {
                    iError++;
                    aErrors.push("Row " + (index + 1) + ": Invalid data");
                    fnProcessNext.call(this, index + 1);
                    return;
                }

                // Create book entry
                var oEntry = {
                    title: oRow.title.toString(),
                    author_ID: oRow.author_ID.toString(),
                    price: parseFloat(oRow.price).toString(),
                    stock: parseInt(oRow.stock, 10)
                };

                oMainModel.create("/Books", oEntry, {
                    success: function () {
                        iSuccess++;
                        fnProcessNext.call(this, index + 1);
                    }.bind(this),
                    error: function (oError) {
                        iError++;
                        var sErrorMsg = "Row " + (index + 1) + " (" + oRow.title + "): ";
                        try {
                            var oErrorResponse = JSON.parse(oError.responseText);
                            sErrorMsg += oErrorResponse.error.message.value;
                        } catch (e) {
                            sErrorMsg += "Failed to create";
                        }
                        aErrors.push(sErrorMsg);
                        fnProcessNext.call(this, index + 1);
                    }.bind(this)
                });

            }.bind(this);

            // Start processing
            fnProcessNext(0);
        },

        // _handleFileUpload: function () {
        //     var oFileUploader = this.byId("fileUploader");
        //     var oModel = this.getView().getModel("uploadModel");

        //     // Simulate upload for now (replace with actual backend call)
        //     var iProgress = 0;
        //     var oInterval = setInterval(function () {
        //         iProgress += 10;
        //         oModel.setProperty("/uploadProgress", iProgress);
        //         oModel.setProperty("/uploadProgressText", iProgress + "%");

        //         if (iProgress >= 100) {
        //             clearInterval(oInterval);
        //             oModel.setProperty("/uploading", false);
        //             oModel.setProperty("/showResults", true);
        //             oModel.setProperty("/resultMessage", "File(s) uploaded successfully");
        //             oModel.setProperty("/resultType", "Success");

        //             MessageToast.show("Upload completed");
        //         }
        //     }, 200);

        //     // For actual implementation, use:
        //     // oFileUploader.upload();
        // },

        _handleFileUpload: function () {
            var oFileUploader = this.byId("fileUploader");
            var oFiles = oFileUploader.oFileUpload.files;
            var oModel = this.getView().getModel("uploadModel");
            var sUploadType = oModel.getProperty("/uploadType");

            if (!oFiles || oFiles.length === 0) {
                MessageBox.error("Please select a file");
                oModel.setProperty("/uploading", false);
                return;
            }

            if (sUploadType === "document") {
                this._handleDocumentUpload(oFiles);
            } else if (sUploadType === "image") {
                this._handleImageUpload(oFiles);
            }
        },

        _handleDocumentUpload: function (oFiles) {
            var oModel = this.getView().getModel("uploadModel");
            var aAllBooks = [];
            var iFilesProcessed = 0;

            oModel.setProperty("/uploadProgress", 10);
            oModel.setProperty("/uploadProgressText", "10% - Reading files...");

            var fnProcessNextFile = function (index) {
                if (index >= oFiles.length) {
                    // All files read, now create books
                    if (aAllBooks.length > 0) {
                        this._createBooksFromParsedData(aAllBooks);
                    } else {
                        oModel.setProperty("/uploading", false);
                        MessageBox.error("No valid book data found in the uploaded files");
                    }
                    return;
                }

                var oFile = oFiles[index];
                var sFileName = oFile.name.toLowerCase();
                var iProgressBase = 10 + (index / oFiles.length) * 40; // 10-50% for reading files
                oModel.setProperty("/uploadProgress", Math.round(iProgressBase));
                oModel.setProperty("/uploadProgressText", Math.round(iProgressBase) + "% - Reading " + oFile.name);

                if (sFileName.endsWith('.pdf')) {
                    this._parsePDFFile(oFile, function (aBooks) {
                        aAllBooks = aAllBooks.concat(aBooks);
                        fnProcessNextFile.call(this, index + 1);
                    }.bind(this));
                } else if (sFileName.endsWith('.txt')) {
                    this._parseTextFile(oFile, function (aBooks) {
                        aAllBooks = aAllBooks.concat(aBooks);
                        fnProcessNextFile.call(this, index + 1);
                    }.bind(this));
                } else if (sFileName.endsWith('.doc') || sFileName.endsWith('.docx')) {
                    this._parseWordFile(oFile, function (aBooks) {
                        aAllBooks = aAllBooks.concat(aBooks);
                        fnProcessNextFile.call(this, index + 1);
                    }.bind(this));
                } else {
                    fnProcessNextFile.call(this, index + 1);
                }
            }.bind(this);

            fnProcessNextFile(0);
        },

        _parseTextFile: function (oFile, fnCallback) {
            var reader = new FileReader();

            reader.onload = function (e) {
                try {
                    var sText = e.target.result;
                    var aBooks = this._extractBooksFromText(sText);
                    fnCallback(aBooks);
                } catch (error) {
                    MessageBox.warning("Failed to parse " + oFile.name + ": " + error.message);
                    fnCallback([]);
                }
            }.bind(this);

            reader.onerror = function () {
                MessageBox.warning("Failed to read " + oFile.name);
                fnCallback([]);
            };

            reader.readAsText(oFile);
        },

        _parsePDFFile: function (oFile, fnCallback) {
            // Check if PDF.js is available
            if (typeof pdfjsLib === "undefined") {
                MessageBox.warning("PDF.js library not available. Cannot parse PDF files. Please use Excel format.");
                fnCallback([]);
                return;
            }

            var reader = new FileReader();

            reader.onload = function (e) {
                var typedarray = new Uint8Array(e.target.result);

                pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
                    var numPages = pdf.numPages;
                    var sAllText = "";
                    var iPagesProcessed = 0;

                    var fnProcessPage = function (pageNum) {
                        pdf.getPage(pageNum).then(function (page) {
                            page.getTextContent().then(function (textContent) {
                                var pageText = textContent.items.map(function (item) {
                                    return item.str;
                                }).join(' ');
                                sAllText += pageText + "\n";

                                iPagesProcessed++;
                                if (iPagesProcessed === numPages) {
                                    var aBooks = this._extractBooksFromText(sAllText);
                                    fnCallback(aBooks);
                                } else if (pageNum < numPages) {
                                    fnProcessPage(pageNum + 1);
                                }
                            }.bind(this));
                        }.bind(this));
                    }.bind(this);

                    fnProcessPage(1);
                }.bind(this)).catch(function (error) {
                    MessageBox.warning("Failed to parse PDF " + oFile.name + ": " + error.message);
                    fnCallback([]);
                });
            }.bind(this);

            reader.onerror = function () {
                MessageBox.warning("Failed to read " + oFile.name);
                fnCallback([]);
            };

            reader.readAsArrayBuffer(oFile);
        },

        _parseWordFile: function (oFile, fnCallback) {
            // Check if mammoth is available
            if (typeof mammoth === "undefined") {
                MessageBox.warning("Mammoth library not available. Cannot parse Word files. Please use Excel format.");
                fnCallback([]);
                return;
            }

            var reader = new FileReader();

            reader.onload = function (e) {
                mammoth.extractRawText({ arrayBuffer: e.target.result })
                    .then(function (result) {
                        var sText = result.value;
                        var aBooks = this._extractBooksFromText(sText);
                        fnCallback(aBooks);
                    }.bind(this))
                    .catch(function (error) {
                        MessageBox.warning("Failed to parse Word file " + oFile.name + ": " + error.message);
                        fnCallback([]);
                    });
            }.bind(this);

            reader.onerror = function () {
                MessageBox.warning("Failed to read " + oFile.name);
                fnCallback([]);
            };

            reader.readAsArrayBuffer(oFile);
        },

        _extractBooksFromText: function (sText) {
            var aBooks = [];
            var aLines = sText.split('\n');
            
            // Look for table headers with our required columns
            var iHeaderIndex = -1;
            var oColumnIndices = {};

            for (var i = 0; i < aLines.length; i++) {
                var sLine = aLines[i].toLowerCase().trim();
                
                // Check if this line contains all required column headers
                if (sLine.includes('title') && 
                    sLine.includes('author') && 
                    sLine.includes('price') && 
                    sLine.includes('stock')) {
                    
                    iHeaderIndex = i;
                    
                    // Try to determine column positions (for tab/space separated values)
                    var aHeaders = aLines[i].split(/[\t|,;]+/);
                    for (var j = 0; j < aHeaders.length; j++) {
                        var sHeader = aHeaders[j].toLowerCase().trim();
                        if (sHeader.includes('title')) oColumnIndices.title = j;
                        if (sHeader.includes('author')) oColumnIndices.author = j;
                        if (sHeader.includes('price')) oColumnIndices.price = j;
                        if (sHeader.includes('stock')) oColumnIndices.stock = j;
                    }
                    break;
                }
            }

            if (iHeaderIndex === -1) {
                return aBooks; // No table found
            }

            // Parse data rows after header
            for (var k = iHeaderIndex + 1; k < aLines.length; k++) {
                var sDataLine = aLines[k].trim();
                
                // Skip empty lines
                if (!sDataLine) continue;
                
                // Split by common delimiters
                var aParts = sDataLine.split(/[\t|,;]+/);
                
                // Skip if not enough columns
                if (aParts.length < 4) continue;

                var oBook = {};
                
                // Extract values based on column indices or order
                if (Object.keys(oColumnIndices).length === 4) {
                    oBook.title = aParts[oColumnIndices.title] ? aParts[oColumnIndices.title].trim() : "";
                    oBook.author_ID = aParts[oColumnIndices.author] ? aParts[oColumnIndices.author].trim() : "";
                    oBook.price = aParts[oColumnIndices.price] ? aParts[oColumnIndices.price].trim() : "";
                    oBook.stock = aParts[oColumnIndices.stock] ? aParts[oColumnIndices.stock].trim() : "";
                } else {
                    // Fallback: assume order is title, author_ID, price, stock
                    oBook.title = aParts[0] ? aParts[0].trim() : "";
                    oBook.author_ID = aParts[1] ? aParts[1].trim() : "";
                    oBook.price = aParts[2] ? aParts[2].trim() : "";
                    oBook.stock = aParts[3] ? aParts[3].trim() : "";
                }

                // Validate the book data
                if (this._validateBookRow(oBook)) {
                    aBooks.push(oBook);
                }
            }

            return aBooks;
        },

        _handleImageUpload: function (oFiles) {
            var oModel = this.getView().getModel("uploadModel");
            
            // Check if Tesseract is available
            if (typeof Tesseract === "undefined") {
                MessageBox.error(
                    "OCR library (Tesseract.js) not available. Cannot extract text from images.\n\n" +
                    "Please use Excel, PDF, Word, or text file formats instead."
                );
                oModel.setProperty("/uploading", false);
                return;
            }

            var aAllBooks = [];
            var iFilesProcessed = 0;

            var fnProcessNextFile = function (index) {
                if (index >= oFiles.length) {
                    // All files processed
                    if (aAllBooks.length > 0) {
                        this._createBooksFromParsedData(aAllBooks);
                    } else {
                        oModel.setProperty("/uploading", false);
                        MessageBox.error("No valid book data found in the images");
                    }
                    return;
                }

                var oFile = oFiles[index];
                var iProgressBase = 10 + (index / oFiles.length) * 60; // 10-70% for OCR
                oModel.setProperty("/uploadProgress", Math.round(iProgressBase));
                oModel.setProperty("/uploadProgressText", Math.round(iProgressBase) + "% - Processing " + oFile.name);

                Tesseract.recognize(
                    oFile,
                    'eng',
                    {
                        logger: function (m) {
                            if (m.status === 'recognizing text') {
                                var iOCRProgress = Math.round(iProgressBase + (m.progress * (60 / oFiles.length)));
                                oModel.setProperty("/uploadProgress", iOCRProgress);
                            }
                        }
                    }
                ).then(function (result) {
                    var sText = result.data.text;
                    var aBooks = this._extractBooksFromText(sText);
                    aAllBooks = aAllBooks.concat(aBooks);
                    fnProcessNextFile.call(this, index + 1);
                }.bind(this)).catch(function (error) {
                    MessageBox.warning("Failed to process image " + oFile.name + ": " + error.message);
                    fnProcessNextFile.call(this, index + 1);
                }.bind(this));

            }.bind(this);

            fnProcessNextFile(0);
        },

        _createBooksFromParsedData: function (aData) {
            var oMainModel = this.getView().getModel();
            var oUploadModel = this.getView().getModel("uploadModel");

            var iTotal = aData.length;
            var iSuccess = 0;
            var iError = 0;
            var aErrors = [];

            oUploadModel.setProperty("/uploadProgress", 70);
            oUploadModel.setProperty("/uploadProgressText", "70% - Creating books...");

            var fnProcessNext = function (index) {
                if (index >= iTotal) {
                    // All done
                    oUploadModel.setProperty("/uploading", false);
                    oUploadModel.setProperty("/uploadProgress", 100);

                    var sMessage = iSuccess + " book(s) created successfully";
                    if (iError > 0) {
                        sMessage += ", " + iError + " failed";
                    }

                    // Refresh table
                    var oSmartTable = this.byId("booksSmartTable");
                    if (oSmartTable) {
                        oSmartTable.rebindTable();
                    }

                    // Show success message and close dialog
                    if (iError === 0) {
                        MessageToast.show(sMessage);
                        this.onCloseUploadDialog();
                    } else {
                        MessageBox.warning(
                            sMessage + "\n\nErrors:\n" + aErrors.slice(0, 5).join("\n") +
                            (aErrors.length > 5 ? "\n... and " + (aErrors.length - 5) + " more" : ""),
                            {
                                title: "Upload Complete",
                                onClose: function () {
                                    this.onCloseUploadDialog();
                                }.bind(this)
                            }
                        );
                    }

                    return;
                }

                var oRow = aData[index];
                var iProgress = 70 + Math.round((index / iTotal) * 30); // 70-100% for creating
                oUploadModel.setProperty("/uploadProgress", iProgress);
                oUploadModel.setProperty("/uploadProgressText", iProgress + "% (" + (index + 1) + "/" + iTotal + ")");

                // Validate row
                if (!this._validateBookRow(oRow)) {
                    iError++;
                    aErrors.push("Row " + (index + 1) + ": Invalid data");
                    fnProcessNext.call(this, index + 1);
                    return;
                }

                // Create book entry
                var oEntry = {
                    title: oRow.title.toString(),
                    author_ID: oRow.author_ID.toString(),
                    price: parseFloat(oRow.price).toString(),
                    stock: parseInt(oRow.stock, 10)
                };

                oMainModel.create("/Books", oEntry, {
                    success: function () {
                        iSuccess++;
                        fnProcessNext.call(this, index + 1);
                    }.bind(this),
                    error: function (oError) {
                        iError++;
                        var sErrorMsg = "Row " + (index + 1) + " (" + oRow.title + "): ";
                        try {
                            var oErrorResponse = JSON.parse(oError.responseText);
                            sErrorMsg += oErrorResponse.error.message.value;
                        } catch (e) {
                            sErrorMsg += "Failed to create";
                        }
                        aErrors.push(sErrorMsg);
                        fnProcessNext.call(this, index + 1);
                    }.bind(this)
                });

            }.bind(this);

            // Start processing
            fnProcessNext(0);
        },

        onUploadComplete: function (oEvent) {
            var oModel = this.getView().getModel("uploadModel");
            var sResponse = oEvent.getParameter("response");

            oModel.setProperty("/uploading", false);
            oModel.setProperty("/uploadProgress", 100);
            oModel.setProperty("/showResults", true);

            if (oEvent.getParameter("status") === 200) {
                oModel.setProperty("/resultMessage", "Upload successful");
                oModel.setProperty("/resultType", "Success");
                MessageToast.show("Files uploaded successfully");
            } else {
                oModel.setProperty("/resultMessage", "Upload failed: " + sResponse);
                oModel.setProperty("/resultType", "Error");
            }
        },

        onTypeMismatch: function (oEvent) {
            var sFileName = oEvent.getParameter("fileName");
            var sFileType = oEvent.getParameter("fileType");
            var oModel = this.getView().getModel("uploadModel");
            var aAllowedTypes = oModel.getProperty("/allowedTypes");

            MessageBox.error(
                "File type '" + sFileType + "' is not allowed.\n" +
                "Allowed types: " + aAllowedTypes.join(", ")
            );
        },

        onFileSizeExceed: function (oEvent) {
            var sFileName = oEvent.getParameter("fileName");
            var sFileSize = oEvent.getParameter("fileSize");
            var oModel = this.getView().getModel("uploadModel");
            var iMaxSize = oModel.getProperty("/maxFileSize");

            MessageBox.error(
                "File '" + sFileName + "' exceeds maximum size of " + iMaxSize + "MB"
            );
        },

        onRemoveFile: function (oEvent) {
            MessageToast.show("To remove file, clear and select again");
        },

        _formatFileSize: function (iBytes) {
            if (iBytes === 0) return '0 Bytes';
            var k = 1024;
            var sizes = ['Bytes', 'KB', 'MB', 'GB'];
            var i = Math.floor(Math.log(iBytes) / Math.log(k));
            return Math.round(iBytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        },

        _getFileIcon: function (sFileName) {
            var sExtension = sFileName.split('.').pop().toLowerCase();
            var mIcons = {
                "xlsx": "sap-icon://excel-attachment",
                "xls": "sap-icon://excel-attachment",
                "pdf": "sap-icon://pdf-attachment",
                "doc": "sap-icon://doc-attachment",
                "docx": "sap-icon://doc-attachment",
                "txt": "sap-icon://document-text",
                "jpg": "sap-icon://camera",
                "jpeg": "sap-icon://camera",
                "png": "sap-icon://camera",
                "gif": "sap-icon://camera"
            };
            return mIcons[sExtension] || "sap-icon://document";
        },

        // ========== CREATE BOOK DIALOG ==========
        onOpenCreateDialog: function () {
            var oView = this.getView();

            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "com.study.view.CreateBookDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pDialog.then(function (oDialog) {
                this.getView().getModel("newBook").setData({
                    title: "",
                    author_ID: "",
                    price: null,
                    stock: null
                });

                oDialog.open();
            }.bind(this));
        },

        onCloseCreateDialog: function () {
            this.byId("createBookDialog").close();
        },

        onCreateBook: function () {
            var oModel = this.getView().getModel();
            var oNewBook = this.getView().getModel("newBook").getData();

            if (!oNewBook.title || !oNewBook.author_ID || !oNewBook.price || !oNewBook.stock) {
                MessageBox.error("Please fill in all required fields");
                return;
            }

            if (parseFloat(oNewBook.price) <= 0) {
                MessageBox.error("Price must be greater than 0");
                return;
            }

            if (parseInt(oNewBook.stock, 10) < 0) {
                MessageBox.error("Stock cannot be negative");
                return;
            }

            var oEntry = {
                title: oNewBook.title,
                author_ID: oNewBook.author_ID,
                price: parseFloat(oNewBook.price).toString(),
                stock: parseInt(oNewBook.stock, 10)
            };

            oModel.create("/Books", oEntry, {
                success: function () {
                    MessageToast.show("Book '" + oNewBook.title + "' created successfully");
                    this.onCloseCreateDialog();

                    var oSmartTable = this.byId("booksSmartTable");
                    if (oSmartTable) {
                        oSmartTable.rebindTable();
                    }
                    
                    // Reload notifications to see new book notification
                    this._loadNotifications();
                }.bind(this),
                error: function (oError) {
                    var sMessage = "Failed to create book";
                    if (oError.responseText) {
                        try {
                            var oErrorResponse = JSON.parse(oError.responseText);
                            sMessage = oErrorResponse.error.message.value || sMessage;
                        } catch (e) {
                            // Use default message
                        }
                    }
                    MessageBox.error(sMessage);
                }
            });
        },

        // ========== CLEANUP ==========
        onExit: function () {
            // Clear notification refresh interval
            if (this._notificationRefreshInterval) {
                clearInterval(this._notificationRefreshInterval);
            }

            if (this._pDialog) {
                this._pDialog.then(function (oDialog) {
                    oDialog.destroy();
                });
            }
            if (this._pUploadDialog) {
                this._pUploadDialog.then(function (oDialog) {
                    oDialog.destroy();
                });
            }
            if (this._pNotificationPopover) {
                this._pNotificationPopover.then(function (oPopover) {
                    oPopover.destroy();
                });
            }
        }
    });
});