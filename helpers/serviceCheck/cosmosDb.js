const { CosmosClient } = require('@azure/cosmos');
const surveyHelper = require('../survey');

const checkCosmosDb = async () => {
  const envs = [{
    name: 'CosmosDB',
    errMessage: 'Missing CosmosDB env'
  }];

  for (let i = 0; i < envs.length; i++) {
    if (!process.env[envs[i].name]) {
      return {
        isSuccess: false,
        message: envs[i].errMessage
      };
    }
  }

  const config = surveyHelper.getDbConfig();

  if (!(config.AccountEndpoint && config.AccountKey)) {
    return {
      isSuccess: false,
      message: 'Unable to retrieve config values.'
    };
  }

  const data = {
    isSuccess: false,
    message: ''
  };

  const client = new CosmosClient({ endpoint: config.AccountEndpoint, key: config.AccountKey });
  try {
    await client.getDatabaseAccount();
    data.isSuccess = true;
  } catch (error) {
    data.message = `${error}`;
  }

  return data;
};

module.exports = checkCosmosDb;
