const cds = require("@sap/cds");
const cov2ap = require("@cap-js-community/odata-v2-adapter");

if (process.env.NODE_ENV !== "production") {
	const express = require("express");
	cds.on("bootstrap", (app) => {
	});
}

cds.on("bootstrap", (app) => app.use(cov2ap()));

module.exports = cds.server;