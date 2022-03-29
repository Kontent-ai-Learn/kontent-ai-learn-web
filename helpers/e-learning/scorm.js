const axios = require('axios');
const app = require('../app');

const settings = {
  auth: {
      username: process.env.SCORM_APP_ID || '',
      password: process.env.SCORM_SECRET_KEY || ''
  },
  registrationsUrl: `https://${process.env.SCORM_HOST}/api/v2/registrations`,
  coursesUrl: `https://${process.env.SCORM_HOST}/api/v2/courses`,
};

const logAppInsightsError = (error) => {
  if (app.appInsights) {
    app.appInsights.defaultClient.trackTrace({ message: `SCORM_ERROR: ${error}` });
  }
};

const getUserRegistrations = async (email) => {
  try {
    const registrations = [];
    let more = 'first';

    while (more) {
      let qs = `learnerId=${encodeURIComponent(email)}`;
      if (more && more !== 'first') {
        qs = `more=${more}`;
      }
      const page = await axios({
        method: 'get',
        url: `${settings.registrationsUrl}?${qs}`,
        auth: settings.auth
      });

      registrations.push(...page.data.registrations);
      console.log(page.data.more);
      more = page.data.more;
    };

    return registrations;
  } catch (error) {
    logAppInsightsError(error);
  }

  return null;
};

module.exports = {
  getUserRegistrations
};
