const cosmos = require('../services/cosmos');
const errorAppInsights = require('../error/appInsights');

const addRecord = async (body) => {
  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_REPORTING);
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
