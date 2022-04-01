const { CosmosClient } = require('@azure/cosmos');
const errorAppInsights = require('../error/appInsights')

const initDatabase = async (containerId) => {
  const client = new CosmosClient({ endpoint: process.env.COSMOSDB_ENDPOINT, key: process.env.COSMOSDB_KEY });
  try {
    const { database } = await client.databases.createIfNotExists({ id: process.env.COSMOSDB_DATABASE });
    const { container } = await database.containers.createIfNotExists({ id: containerId });
    return container;
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
  }
};

module.exports = {
  initDatabase
};
