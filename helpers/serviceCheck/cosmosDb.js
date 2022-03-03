const { CosmosClient } = require('@azure/cosmos');

const checkCosmosDb = async () => {
  const envs = [{
    name: 'COSMOSDB_ENDPOINT',
    errMessage: 'Missing COSMOSDB_ENDPOINT env'
  }, {
    name: 'COSMOSDB_KEY',
    errMessage: 'Missing COSMOSDB_KEY env'
  }, {
    name: 'COSMOSDB_DATABASE',
    errMessage: 'Missing COSMOSDB_DATABASE env'
  }, {
    name: 'COSMOSDB_CONTAINER_SURVEY',
    errMessage: 'Missing COSMOSDB_CONTAINER_SURVEY env'
  }, {
    name: 'COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT',
    errMessage: 'Missing COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT env'
  }];

  for (let i = 0; i < envs.length; i++) {
    if (!process.env[envs[i].name]) {
      return {
        isSuccess: false,
        message: envs[i].errMessage
      };
    }
  }

  const data = {
    isSuccess: false,
    message: ''
  };

  const client = new CosmosClient({ endpoint: process.env.COSMOSDB_ENDPOINT, key: process.env.COSMOSDB_KEY });
  try {
    await client.getDatabaseAccount();
    data.isSuccess = true;
  } catch (error) {
    data.message = `${error}`;
  }

  return data;
};

module.exports = checkCosmosDb;
