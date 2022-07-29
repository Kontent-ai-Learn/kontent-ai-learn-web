const cosmos = require('../services/cosmos');
const errorAppInsights = require('../error/appInsights');

const addRecord = async (body) => {
  const report = JSON.parse(JSON.stringify(body));
  if (body.id) {
    report.registrationId = body.id;
    delete report.id;
  }

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_REPORTING);
    report._partitionKey = report?.learner?.id?.toLowerCase();
    await db.items.create(report);
    return true;
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
    return false;
  }
};

module.exports = {
  addRecord
};
