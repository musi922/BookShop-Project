namespace com.study;
using { managed, cuid } from '@sap/cds/common';

aspect CommonFields : managed, cuid {};

entity Books: CommonFields{
    title: String;
    stock: Integer;
    price: Decimal;
    author: Association to Authors;
}

entity Authors : CommonFields {
    name: String;
}

entity Notifications : CommonFields {
    title: String(200);
    message: String(1000);
    type: String(50); // 'info', 'warning', 'error', 'success'
    isRead: Boolean default false;
    priority: String(20) default 'normal'; // 'low', 'normal', 'high', 'urgent'
    relatedEntity: String(100); // e.g., 'Books', 'Authors'
    relatedEntityId: UUID;
}