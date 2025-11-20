using { com.bank as my } from '../db/bank-schema';

service BankService {
    entity FundingApplications as projection on my.FundingApplications;
    entity ApplicationDocuments as projection on my.ApplicationDocuments;
    
    // Submit application - returns generated ID
    action submitApplication(
        programId: String,
        programName: String,
        payload: String,
        documents: array of {
            type: String;
            fileName: String;
        }
    ) returns {
        applicationId: String;
        status: String;
        message: String;
    };
    
    function getApplicationById(applicationId: UUID) returns FundingApplications;
    
    // Get user's applications by email
    function getMyApplications(email: String) returns array of FundingApplications;
}