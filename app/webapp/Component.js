sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "com/study/model/models"
], function (UIComponent, Device, models) {
    "use strict";

    return UIComponent.extend("com.study.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            // Initialize router
            this.getRouter().initialize();

            // Set device model globally
            this.setModel(models.createDeviceModel(), "device");
        }
    });
});
