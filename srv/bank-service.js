const cds = require('@sap/cds');

class BankService extends cds.ApplicationService {
  async init() {
    this.on('submitApplication', this.#handleApplicationSubmission);
    this.on('getApplicationById', this.#getById);
    this.on('getMyApplications', this.#getMyApplications);

    await super.init();
  }

  async #handleApplicationSubmission(req) {
    const { programId, programName, payload, documents } = req.data;

    try {
      // Parse to validate and extract email
      const formData = JSON.parse(payload);
      const applicantEmail = formData.applicant?.email;

      if (!applicantEmail) {
        return req.error(400, 'MISSING_EMAIL', 'Applicant email is required');
      }

      const submittedAt = new Date().toISOString();

      // Store application with payload
      const result = await INSERT.into('com.bank.FundingApplications').entries({
        programId,
        programName,
        payload,
        status: 'SUBMITTED',
        applicantEmail,
        submittedAt,
      });

      const applicationId = result.ID || result;

      // Store documents if any
      if (documents?.length > 0) {
        await INSERT.into('com.bank.ApplicationDocuments').entries(
          documents.map(doc => ({
            application_ID: applicationId,
            documentType: doc.type,
            fileName: doc.fileName,
            uploadedAt: submittedAt,
          }))
        );
      }

      return {
        applicationId: applicationId,
        status: 'SUBMITTED',
        message: 'Application submitted successfully',
      };
    } catch (error) {
      console.error('Submission error:', error);
      return req.error(500, 'SUBMISSION_FAILED', 'Submission failed: ' + error.message);
    }
  }

  async #getById(req) {
    const { applicationId } = req.data;

    if (!applicationId) {
      return req.error(400, 'MISSING_ID', 'Application ID is required');
    }

    try {
      const application = await SELECT.one
        .from('com.bank.FundingApplications')
        .where({ ID: applicationId });

      if (!application) {
        return req.error(404, 'NOT_FOUND', 'Application not found');
      }

      return application;
    } catch (error) {
      console.error('Get application error:', error);
      return req.error(500, 'FETCH_FAILED', 'Failed to fetch application: ' + error.message);
    }
  }

  async #getMyApplications(req) {
    const { email } = req.data;

    if (!email) {
      return req.error(400, 'MISSING_EMAIL', 'Email is required');
    }

    try {
      const applications = await SELECT.from('com.bank.FundingApplications')
        .where({ applicantEmail: email })
        .orderBy('submittedAt desc');

      return applications || [];
    } catch (error) {
      console.error('Get my applications error:', error);
      return req.error(500, 'FETCH_FAILED', 'Failed to fetch applications: ' + error.message);
    }
  }
}

module.exports = BankService;
