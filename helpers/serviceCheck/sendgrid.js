const axios = require('axios');

const checkSendgrid = async () => {
  const envs = [{
    name: 'SENDGRID_API_KEY',
    errMessage: 'Missing SENDGRID_API_KEY env'
  }, {
    name: 'SENDGRID_EMAIL_ADDRESS_FROM',
    errMessage: 'Missing SENDGRID_EMAIL_ADDRESS_FROM env',
  }, {
    name: 'SENDGRID_EMAIL_ADDRESS_TO',
    errMessage: 'Missing SENDGRID_EMAIL_ADDRESS_TO env',
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
    const response = await axios('https://api.sendgrid.com/v3/scopes', {
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`
      }
    });

    if (response.status === 200 && response.data?.scopes?.includes('mail.send')) {
      data.isSuccess = true;
      delete data.message;
    } else {
      data.message = 'API key (SENDGRID_API_KEY env) does not have permissions to send emails'
    }
  } catch (error) {
    data.message = `${error.message}, Most likely the SENDGRID_API_KEY env is invalid`;
  }

  return data;
};

module.exports = checkSendgrid;
