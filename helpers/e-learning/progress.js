const cosmos = require('../services/cosmos');
const errorAppInsights = require('../error/appInsights');

const registrationIdExistsInDb = async (db, id) => {
  const query = {
    query: 'SELECT * FROM c WHERE c.registrationId = @id',
    parameters: [{
      name: '@id',
      value: id
    }]
  };
  const { resources } = await db.items.query(query).fetchAll();
  if (resources && resources.length) return resources[0];
  return null;
};

const createProgress = (registration) => {
  if (!registration) return null;
  return {
    _partitionKey: registration.learner?.id?.toLowerCase() || null,
    registrationId: registration.id || null,
    courseId: registration.course?.id || null,
    courseTitle: registration.course?.title || null,
    status: registration.activityDetails?.activityCompletion || null,
    firstAccessDate: registration.firstAccessDate || null,
    lastAccessDate: registration.lastAccessDate || null,
    completedDate: registration.completedDate || null
  };
};

const setRecord = async (body) => {
  const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_PROGRESS);
  const registration = await registrationIdExistsInDb(db, body.id);
  const progress = createProgress(body);

  try {
    if (registration && progress) {
      const itemToUpdate = await db.item(registration.id);
      progress.id = registration.id;
      await itemToUpdate.replace(progress);
    } else {
      await db.items.create(progress);
    }
    return true;
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
    return false;
  }
};

module.exports = {
  setRecord
};
