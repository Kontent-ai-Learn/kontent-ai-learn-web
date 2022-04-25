const { CosmosClient } = require('@azure/cosmos');
const app = require('../app');

const logAppInsightsError = (error) => {
  if (app.appInsights) {
    app.appInsights.defaultClient.trackTrace({ message: `COSMOSDB_ERROR: ${error}` });
  }
};

const initDatabase = async (containerId) => {
  if (!app.cosmosClient) {
    app.cosmosClient = new CosmosClient({ endpoint: process.env.COSMOSDB_ENDPOINT, key: process.env.COSMOSDB_KEY });
  }

  try {
    const { database } = await app.cosmosClient.databases.createIfNotExists({ id: process.env.COSMOSDB_DATABASE });
    const { container } = await database.containers.createIfNotExists({ id: containerId });
    return container;
  } catch (error) {
    logAppInsightsError(error);
  }
};

module.exports = {
  initDatabase,
  logAppInsightsError
};
