const lms = require('../lms');
const sendSendGridEmail = require('../sendgrid');
const app = require('../../app');
const axios = require('axios');

const getUser = async (email) => {
  const url = `${process.env['SubscriptionService.Url']}${email}/`;
  let user;
  let errCode;

  try {
    user = await axios({
      method: 'get',
      url: url,
      headers: {
        Authorization: `Bearer ${process.env['SubscriptionService.Bearer']}`
      }
    });
  } catch (err) {
    if (!err.response) {
      err.response = {
        data: {
          message: `Invalid request to ${url}`
        }
      };
    }
    if (typeof err.response.data === 'string') {
      err.response.data = { message: err.response.data };
    }
    err.response.data.userEmail = email;
    err.response.data.file = 'helpers/e-learning/subscriptionService.js';
    const notification = lms.composeNotification('Request to Subscription service failed with the following error:', err.response.data);
    const emailInfo = {
      recipient: process.env.SENDGRID_EMAIL_ADDRESS_TO,
      subject: 'Unable to obtain user form Subscription Service',
      text: notification
    };
    await sendSendGridEmail(emailInfo);

    if (app.appInsights) {
      app.appInsights.defaultClient.trackTrace({ message: `SUBSCRIPTION_SERVICE_ERROR: ${notification}` });
    }

    errCode = err.response.data.code;
  }
  return { user, errCode };
};

module.exports = {
  getUser
};
