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

const createProgress = (payload, registration) => {
  if (!payload) return null;

  const progress = {
    _partitionKey: payload.learner?.id?.toLowerCase() || null,
    registrationId: payload.id || null,
    courseId: payload.course?.id || null,
    courseTitle: payload.course?.title || null,
    status: payload.activityDetails?.activityCompletion || null,
    firstAccessDate: payload.firstAccessDate || null,
    lastAccessDate: payload.lastAccessDate || null,
    completedDate: payload.completedDate || null
  };

  if (registration) {
    progress.firstAccessDate = registration.firstAccessDate;
    progress.id = registration.id;

    if (registration.status === 'COMPLETED') {
      progress.status = registration.status;
      progress.completedDate = registration.completedDate;
    }
  }

  return progress;
};

const setRecord = async (payload) => {
  const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_PROGRESS);
  const registration = await registrationIdExistsInDb(db, payload.id);

  try {
    if (registration) {
      const itemToUpdate = await db.item(registration.id);
      const progress = createProgress(payload, registration);
      await itemToUpdate.replace(progress);
    } else {
      const progress = createProgress(payload);
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
