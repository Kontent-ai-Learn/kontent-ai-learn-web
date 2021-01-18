const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const send = (info) => {
  const msg = {
    to: info.recipient,
    from: process.env.SENDGRID_EMAIL_ADDRESS_FROM,
    subject: info.subject,
    text: info.text,
  };

  sgMail
    .send(msg)
};

module.exports = send;
