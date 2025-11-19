namespace com.bank;
using { managed, cuid } from '@sap/cds/common';

entity FundingApplications : managed, cuid {    
    programId: String(50) not null;
    programName: String(200);
    payload: String(10000) not null;
    
    status: String(50) default 'SUBMITTED';
    submittedAt: DateTime;
    applicantEmail: String(200);
    documents: Association to many ApplicationDocuments on documents.application = $self;
}

entity ApplicationDocuments : managed, cuid {
    application: Association to FundingApplications;
    documentType: String(100);
    fileName: String(500); 
    fileSize: Integer;
    mimeType: String(100);
    fileUrl: String(1000);
    uploadedAt: DateTime;
}