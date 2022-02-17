const axios = require('axios');

const checkScorm = async () => {
  const envs = [{
    name: 'SCORM_APP_ID',
    errMessage: 'Missing SCORM_APP_ID env'
  }, {
    name: 'SCORM_SECRET_KEY',
    errMessage: 'Missing SCORM_SECRET_KEY env',
  }, {
    name: 'SCORM_HOST',
    errMessage: 'Missing SCORM_HOST env',
  }];

  for (let i = 0; i < envs.length; i++) {
    if (!process.env[envs[i].name]) {
      return {
        isSuccess: false,
        message: envs[i].errMessage
      };
    }
  }

  const data = {
    isSuccess: false,
    message: ''
  };

  try {
    const response = await axios(`https://${process.env.SCORM_HOST}/api/v2/registrations`, {
      auth: {
        username: process.env.SCORM_APP_ID || '',
        password: process.env.SCORM_SECRET_KEY || ''
      }
    });
    if (response.status === 200) {
      data.isSuccess = true;
    }
  } catch (err) {
    if (err.message) {
      data.message = err.message
    }
  }

  return data;
};

module.exports = checkScorm;
