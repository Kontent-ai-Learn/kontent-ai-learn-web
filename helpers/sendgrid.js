const app = require('../app');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const send = async (info) => {
  const msg = {
    to: info.recipient,
    from: {
      email: process.env.SENDGRID_EMAIL_ADDRESS_FROM,
    },
    subject: info.subject,
    html: info.text,
    tracking_settings: {
      click_tracking: {
        enable: false,
        enable_text: false
      }
    }
  };

  if (info.sender_name) {
    msg.from.name = info.sender_name;
  }

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    if (app.appInsights && error.response) {
      app.appInsights.defaultClient.trackTrace({ message: `SENDGRID_ERROR: ${JSON.stringify(error.response?.body.errors)}` });
    }
    return false;
  }
};

module.exports = send;
