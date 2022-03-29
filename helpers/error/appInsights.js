const app = require('../app');

const log = (prefix, error) => {
  if (app.appInsights) {
    app.appInsights.defaultClient.trackTrace({ message: `${prefix}: ${error}` });
  }
};

module.exports = {
  log
};
