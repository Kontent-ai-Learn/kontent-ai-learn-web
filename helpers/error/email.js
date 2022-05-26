const servicesSendgrid = require('../services/sendgrid');

const composeText = (info) => {
  const text = `Environment: ${process.env.baseURL}`;

  if (typeof info === 'object') {
      return `${text}<br>${Object.keys(info).map((key) => {
          return `${key}: ${info[key]}`;
      }).join('<br>')}`;
  }

  return `${text}<br>${info}`;
};

const send = (message) => {
  message.text = composeText(message.content);
  servicesSendgrid.send(message);
};

module.exports = {
  send
};
