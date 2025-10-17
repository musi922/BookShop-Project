const cds = require('@sap/cds');
const { SELECT } = require('@sap/cds/lib/ql/cds-ql');

class StudyService extends cds.ApplicationService {
    async init(){
    this.before('CREATE','Books', this.#validateBooks)
    await super.init()
    }

    async #validateBooks(req){
        const {title,price} = req.data;

        if (!title) return req.error(400, "ERROR_TITLE_IS_REQUIRED");
        if (!price) return req.error(400, "ERROR_PRICE_IS_REQUIRED");

		const [existingTITLE] = await cds.run(
			SELECT.from("Books").where({ title }),
		);

		if (existingTITLE) return req.error(409, "ERROR_TITLE_ALREADY_EXISTS");

        }

}

module.exports = StudyService;