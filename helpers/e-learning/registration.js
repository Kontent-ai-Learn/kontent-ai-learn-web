const cosmos = require('../services/cosmos');
const errorAppInsights = require('../error/appInsights');
const isPreview = require('../kontent/isPreview');

const filterRegistrationsEnv = (registrations, res) => {
  const previewEnv = isPreview(res.locals.previewapikey);
  const devEvn = process.env.isDevelopment === 'true';
  let registrationsEnv = [];

  if (previewEnv && devEvn) {
    registrationsEnv = registrations.filter(item => item.courseId.endsWith('_preview') && item.courseId.startsWith('dev_'));
  }

  if (!previewEnv && devEvn) {
    registrationsEnv = registrations.filter(item => !item.courseId.endsWith('_preview') && item.courseId.startsWith('dev_'));
  }

  if (!previewEnv && !devEvn) {
    registrationsEnv = registrations.filter(item => !item.courseId.endsWith('_preview') && !item.courseId.startsWith('dev_'));
  }

  if (previewEnv && !devEvn) {
    registrationsEnv = registrations.filter(item => item.courseId.endsWith('_preview') && !item.courseId.startsWith('dev_'));
  }

  return registrationsEnv;
};

const getUserRegistrations = async (email, res) => {
  const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_PROGRESS);
  const query = {
    query: 'SELECT * FROM c WHERE c._partitionKey = @email',
    parameters: [{
      name: '@email',
      value: email.toLowerCase()
    }]
  };

  try {
    const { resources } = await db.items.query(query).fetchAll();
    if (resources && resources.length) {
      return filterRegistrationsEnv(resources, res);
    }
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
  }

  return [];
};

module.exports = {
  getUserRegistrations
};
