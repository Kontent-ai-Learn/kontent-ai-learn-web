const cosmos = require('../cosmos');
const certificationData = require('./data');
const elearningUser = require('../e-learning/user');

const successfullAttemptExists = async (body) => {
  const { codename, email } = body;
  let attempt = null;

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT);
    const query = {
        query: 'SELECT * FROM c WHERE c.email = @email AND c.test.codename = @codename AND c.certificate_expiration > @expirationAhead',
        parameters: [{
          name: '@email',
          value: email
        }, {
          name: '@codename',
          value: codename
        }, {
          name: '@expirationAhead',
          value: new Date(new Date().getTime() + 86400000 * 7).toISOString()
        }]
    };

    const { resources } = await db.items.query(query).fetchAll();
    if (resources && resources.length) {
      attempt = resources[0];
    }
  } catch (error) {
    cosmos.logAppInsightsError(error);
  }

  return attempt;
};

const updateAttempt = async (attempt) => {
  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT);
    const itemToUpdate = await db.item(attempt.id);
    await itemToUpdate.replace(attempt);
  } catch (error) {
    cosmos.logAppInsightsError(error);
  }
};

const getAttempt = async (id) => {
  let attempt = null;

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT);
    const query = {
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{
        name: '@id',
        value: id
      }]
    };

    const { resources } = await db.items.query(query).fetchAll();

    if ((resources && resources.length)) {
      attempt = resources[0];
    }
  } catch (error) {
    cosmos.logAppInsightsError(error);
  }

  return attempt;
};

const checkAttemptInPastDay = async (email, codename) => {
  try {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const start = date.toISOString();

    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT);
    const query = {
        query: 'SELECT * FROM c WHERE c.email = @email AND c.test.codename = @codename AND c.start > @start',
        parameters: [{
          name: '@email',
          value: email
        }, {
          name: '@codename',
          value: codename
        }, {
          name: '@start',
          value: start
        }]
    };

    const { resources } = await db.items.query(query).fetchAll();
    return resources;
  } catch (error) {
    cosmos.logAppInsightsError(error);
    return null;
  }
};

const checkCreateAttempt = async (body, res) => {
  const { codename, email } = body;
  let attempt = null;

  const attemptInPastDay = await checkAttemptInPastDay(email, codename);

  if (!(attemptInPastDay && attemptInPastDay.length)) {
    const certificationTestData = await certificationData.getTest(codename, res);

    const { user } = await elearningUser.getUser(email, res);

    try {
      const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT);
      attempt = await db.items.create({
        email: email,
        username: user?.firstName && user?.lastName ? `${user?.firstName} ${user?.lastName}` : email,
        start: new Date().toISOString(),
        end: null,
        score: null,
        certificate_expiration: null,
        email_notifications: {
          congrats: null,
          expriration_ahead: null,
          expired: null
        },
        test: certificationTestData
      });
    } catch (error) {
      cosmos.logAppInsightsError(error);
    }
  } else {
    attempt = {};
    attempt.resource = attemptInPastDay[0];
  }

  return attempt;
};

const getExpirationAttempts = async () => {
  let attempts = null;

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT);
    const query = {
        query: 'SELECT * FROM c WHERE c.certificate_expiration < @expirationAhead AND c.certificate_expiration > @expired',
        parameters: [{
          name: '@expirationAhead',
          value: new Date(new Date().getTime() + 86400000 * 7).toISOString()
        }, {
          name: '@expired',
          value: new Date(new Date().getTime() - 86400000).toISOString()
        }]
    };

    const { resources } = await db.items.query(query).fetchAll();
    if (resources && resources.length) {
      attempts = resources;
    }
  } catch (error) {
    cosmos.logAppInsightsError(error);
  }

  return attempts;
};

module.exports = {
  successfullAttemptExists,
  updateAttempt,
  getAttempt,
  getExpirationAttempts,
  checkCreateAttempt,
  checkAttemptInPastDay
};