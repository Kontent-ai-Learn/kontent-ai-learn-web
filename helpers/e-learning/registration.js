const axios = require('axios');
const errorAppInsights = require('../error/appInsights');
const isPreview = require('../kontent/isPreview');

const settings = {
  auth: {
      username: process.env.SCORM_APP_ID || '',
      password: process.env.SCORM_SECRET_KEY || ''
  },
  registrationsUrl: `https://${process.env.SCORM_HOST}/api/v2/registrations`,
  coursesUrl: `https://${process.env.SCORM_HOST}/api/v2/courses`,
};

const filterRegistrationsEnv = (registrations, res) => {
  const previewEnv = isPreview(res.locals.previewapikey);
  const devEvn = process.env.isDevelopment === 'true';
  let registrationsEnv = [];

  if (previewEnv && devEvn) {
    registrationsEnv = registrations.filter(item => item.course.id.endsWith('_preview') && item.course.id.startsWith('dev_'));
  }

  if (!previewEnv && devEvn) {
    registrationsEnv = registrations.filter(item => !item.course.id.endsWith('_preview') && item.course.id.startsWith('dev_'));
  }

  if (!previewEnv && !devEvn) {
    registrationsEnv = registrations.filter(item => !item.course.id.endsWith('_preview') && !item.course.id.startsWith('dev_'));
  }

  if (previewEnv && !devEvn) {
    registrationsEnv = registrations.filter(item => item.course.id.endsWith('_preview') && !item.course.id.startsWith('dev_'));
  }

  return registrationsEnv;
};

const getUserRegistrations = async (email, res) => {
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
      more = page.data.more;
    };

    const registrationsEnv = filterRegistrationsEnv(registrations, res);

    return registrationsEnv;
  } catch (error) {
    errorAppInsights.log('SCORM_ERROR', error);
  }

  return null;
};

module.exports = {
  getUserRegistrations
};
