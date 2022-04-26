const app = require('../../app');
const consola = require('consola');

const log = (prefix, error) => {
  if (app.appInsights) {
    app.appInsights.defaultClient.trackTrace({ message: `${prefix}: ${error}` });
  }
  consola.error(prefix, error);
};

module.exports = {
  log
};
