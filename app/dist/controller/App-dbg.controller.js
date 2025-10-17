sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.study.controller.App", {
        onInit: function() {
            // Initialize the router
            this.getOwnerComponent().getRouter().initialize();
        }
    });
});