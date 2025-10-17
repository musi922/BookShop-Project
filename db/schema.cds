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

/**I am the Comment */
