const app = require('../app');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const send = (info) => {
  const msg = {
    to: info.recipient,
    from: process.env.SENDGRID_EMAIL_ADDRESS_FROM,
    subject: info.subject,
    text: info.text,
    tracking_settings: {
      click_tracking: {
        enable: false,
        enable_text: false
      }
    }
  };

  sgMail
    .send(msg)
    .catch((error) => {
      if (app.appInsights) {
        app.appInsights.defaultClient.trackTrace({ message: `URL_MAP_INVALIDATE: ${JSON.stringify(error?.response?.body.errors)}` });
      }
    })
};

module.exports = send;
