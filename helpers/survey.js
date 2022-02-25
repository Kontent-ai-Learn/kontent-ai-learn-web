const { CosmosClient } = require('@azure/cosmos');
const app = require('../app');

const buildPostData = (surveyContent, reqBody) => {
  const data = {
    survey_id: surveyContent.system.id,
    email: reqBody.email,
    course_id: reqBody.courseid,
    survey_type: surveyContent.system.name,
    timestamp: new Date().toISOString(),
    items: []
  };

  for (const prop in reqBody) {
    if (Object.prototype.hasOwnProperty.call(reqBody, prop)) {
      if (prop !== 'email' && prop !== 'courseid') {
        const question = prop.split('|');
        const answer = reqBody[prop].split('|');
        data.items.push({
          question_id: question[1] || null,
          question: question[0] || null,
          answer_id: answer[1] || null,
          answer: answer[0] || null,
          type: question[2] || null
        });
      }
    }
  }

  return data;
};

const sendDataToDb = async (data) => {
  const client = new CosmosClient({ endpoint: process.env.COSMOSDB_ENDPOINT, key: process.env.COSMOSDB_KEY });
  try {
    const { database } = await client.databases.createIfNotExists({ id: process.env.COSMOSDB_DATABASE });
    const { container } = await database.containers.createIfNotExists({ id: process.env.COSMOSDB_CONTAINER });
    await container.items.create(data);
  } catch (error) {
    if (app.appInsights) {
      app.appInsights.defaultClient.trackTrace({ message: 'COSMOSDB_ERROR: ' + error });
    }
  }
};

module.exports = {
  buildPostData,
  sendDataToDb
};
