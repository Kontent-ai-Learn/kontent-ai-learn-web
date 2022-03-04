const cosmos = require('../cosmos');
const certificationData = require('./data');

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

const checkCreateAttempt = async (body, res) => {
  const { codename, email, username } = body;
  let attempt = null;

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
    if (!(resources && resources.length)) {
      const certificationTestData = await certificationData.getTest(codename, res);

      attempt = await db.items.create({
        email: email,
        username: username,
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
    } else {
      attempt = {};
      attempt.resource = resources[0];
    }
  } catch (error) {
    cosmos.logAppInsightsError(error);
  }

  return attempt;
};

const getExpirationAttempts = async () => {
  let attempts = null;

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT);
    const query = {
        query: 'SELECT * FROM c WHERE c.score >= @score AND c.certificate_expiration < @expirationAhead AND c.certificate_expiration > @expired',
        parameters: [{
          name: '@score',
          value: 80
        }, {
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
  checkCreateAttempt
};
