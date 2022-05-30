const surveyData = require('./data');
const cosmos = require('../services/cosmos');
const errorAppInsights = require('../error/appInsights');

const getUserCourseAttempt = async (body) => {
  const { courseid, email } = body;
  let attempt = null;

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_SURVEY);
    const query = {
        query: 'SELECT * FROM c WHERE c["end"] < @end AND LOWER(c.email) = @email AND c.course_id = @courseId',
        parameters: [{
          name: '@email',
          value: email.toLowerCase()
        }, {
          name: '@courseId',
          value: courseid
        }, {
          name: '@end',
          value: (new Date()).toISOString()
        }]
    };

    const { resources } = await db.items.query(query).fetchAll();
    if (resources && resources.length) {
      attempt = resources[0];
    }
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
  }

  return attempt;
};

const updateAttempt = async (attempt) => {
  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_SURVEY);
    const itemToUpdate = await db.item(attempt.id);
    await itemToUpdate.replace(attempt);
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
  }
};

const getAttempt = async (id) => {
  let attempt = null;

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_SURVEY);
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
    errorAppInsights.log('COSMOSDB_ERROR', error);
  }

  return attempt;
};

const createAttempt = async (body, user, survey) => {
  const { email, courseid } = body;
  let attempt = null;

  if (!survey.items.length) return attempt;

  const questions = surveyData.getQuestions(survey);

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_SURVEY);
    attempt = await db.items.create({
      survey_id: survey.items[0].system.id,
      codename: survey.items[0].system.codename,
      email: email,
      course_id: courseid,
      username: user?.firstName && user?.lastName ? `${user?.firstName} ${user?.lastName}` : email,
      start: new Date().toISOString(),
      end: null,
      questions: questions,
      _partitionKey: email.toLowerCase()
    });
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
  }

  return attempt;
};

module.exports = {
  createAttempt,
  getAttempt,
  updateAttempt,
  getUserCourseAttempt
};
