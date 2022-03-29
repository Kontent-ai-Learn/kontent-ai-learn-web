const axios = require('axios');
const errorEmail = require('../error/email');
const errorAppInsights = require('../error/appInsights');

const getUser = async (email) => {
  const url = `${process.env['SubscriptionService.Url']}${email}/`;

  try {
    return await axios({
      method: 'get',
      url: url,
      headers: {
        Authorization: `Bearer ${process.env['SubscriptionService.Bearer']}`
      }
    });
  } catch (error) {
    if (!error.response) {
      error.response = {
        data: {
          message: `Invalid request to ${url}`
        }
      };
    }
    if (typeof error.response.data === 'string') {
      error.response.data = { message: error.response.data };
    }

    errorEmail.send({
      recipient: process.env.SENDGRID_EMAIL_ADDRESS_TO,
      subject: 'Unable to obtain user form Subscription Service',
      content: error.response.data
    });
    errorAppInsights.log('SUBSCRIPTION_SERVICE_ERROR', error);
  }
  return null;
};

module.exports = {
  getUser
};
