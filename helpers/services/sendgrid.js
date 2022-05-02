const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const errorAppInsights = require('../error/appInsights');

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
    return await sgMail.send(msg);
  } catch (error) {
    errorAppInsights.log('SENDGRID_ERROR', JSON.stringify(error.response?.body.errors));
  }
};

module.exports = {
  send
};
