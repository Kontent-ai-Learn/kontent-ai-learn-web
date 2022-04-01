const surveyData = require('./data');
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const cosmos = require('../services/cosmos');

const getUserCourseAttempt = async (body) => {
  const { courseid, email } = body;
  let attempt = null;

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_SURVEY);
    const query = {
        query: 'SELECT * FROM c WHERE c["end"] < @end AND c.email = @email AND c.course_id = @courseId',
        parameters: [{
          name: '@email',
          value: email
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
    cosmos.logAppInsightsError(error);
  }

  return attempt;
};

const updateAttempt = async (attempt) => {
  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_SURVEY);
    const itemToUpdate = await db.item(attempt.id);
    await itemToUpdate.replace(attempt);
  } catch (error) {
    cosmos.logAppInsightsError(error);
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
    cosmos.logAppInsightsError(error);
  }

  return attempt;
};

const createAttempt = async (body, user, res) => {
  const { codename, email, courseid } = body;
  let attempt = null;

  const survey = await cacheHandle.evaluateSingle(res, codename, async () => {
    return await getContent.survey(res, codename);
  });

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
      questions: questions
    });
  } catch (error) {
    cosmos.logAppInsightsError(error);
  }

  return attempt;
};

module.exports = {
  createAttempt,
  getAttempt,
  updateAttempt,
  getUserCourseAttempt
};
