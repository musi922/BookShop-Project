const cds = require("@sap/cds");
const cov2ap = require("@cap-js-community/odata-v2-adapter");

if (process.env.NODE_ENV !== "production") {
	cds.on("bootstrap", () => {
	});
}

cds.on("bootstrap", (app) => app.use(cov2ap()));

module.exports = cds.server;