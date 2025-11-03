const cds = require('@sap/cds');
const { SELECT } = require('@sap/cds/lib/ql/cds-ql');

class StudyService extends cds.ApplicationService {
    async init(){
        this.before('CREATE','Books', this.#validateBooks);
        this.after('CREATE', 'Books', this.#createBookNotification);
        this.on('markNotificationAsRead', this.#markAsRead);
        this.on('getUnreadNotificationCount', this.#getUnreadCount);
        
        await super.init();
    }

    async #validateBooks(req){
        const {title, price} = req.data;

        if (!title) return req.error(400, "ERROR_TITLE_IS_REQUIRED");
        if (!price) return req.error(400, "ERROR_PRICE_IS_REQUIRED");

        const [existingTITLE] = await cds.run(
            SELECT.from("Books").where({ title }),
        );

        if (existingTITLE) return req.error(409, "ERROR_TITLE_ALREADY_EXISTS");
    }

    async #createBookNotification(data) {
        // Create notification after book is created
        await INSERT.into('Notifications').entries({
            title: 'New Book Added',
            message: `Book "${data.title}" has been added to the catalog`,
            type: 'success',
            priority: 'normal',
            relatedEntity: 'Books',
            relatedEntityId: data.ID
        });
    }

    async #markAsRead(req) {
        const { notificationId } = req.data;
        
        await UPDATE('Notifications')
            .set({ isRead: true })
            .where({ ID: notificationId });
        
        return true;
    }

    async #getUnreadCount() {
        const result = await SELECT.from('Notifications')
            .where({ isRead: false })
            .columns('count(*) as count');
        
        return result[0].count || 0;
    }
}

module.exports = StudyService;