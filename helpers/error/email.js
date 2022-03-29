const servicesSendgrid = require('../services/sendgrid');

const composeText = (info) => {
  const text = `Environment: ${process.env.baseURL}`;

  if (typeof info === 'object') {
      return `${text}\n${Object.keys(info).map((key) => {
          return `${key}: ${info[key]}`;
      }).join('\n')}`;
  }

  return `${text}\n${info}`;
};

const send = (message) => {
  message.content = composeText()
  servicesSendgrid.send(message);
};

module.exports = {
  send
};
