const cosmos = require('../services/cosmos');
const errorAppInsights = require('../error/appInsights');

const addRecord = async (body) => {
  if (body.id) {
    body.registrationId = body.id;
    delete body.id;
  }

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_REPORTING);
    body._partitionKey = body?.learner?.id?.toLowerCase();
    await db.items.create(body);
    return true;
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
    return false;
  }
};

module.exports = {
  addRecord
};
