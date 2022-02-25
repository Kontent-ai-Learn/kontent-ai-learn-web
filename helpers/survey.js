const { CosmosClient } = require('@azure/cosmos');

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

const getDbConfig = () => {
  let configEnv = process.env.CosmosDB
  if (!configEnv) return null;
  configEnv = configEnv.split(';');
  configEnv = configEnv.filter(item => item);
  const config = {};
  for (let i = 0; i < configEnv.length; i++) {
    const itemSplit = configEnv[i].split('=');
    config[itemSplit[0]] = itemSplit[1];
  }

  // console.log(config);
  return config;
};

const sendDataToDb = async (data) => {
  const config = getDbConfig();
  const client = new CosmosClient({ endpoint: config.AccountEndpoint, key: config.AccountKey });
  try {
    const { database } = await client.databases.createIfNotExists({ id: 'Preview' });
    const { container } = await database.containers.createIfNotExists({ id: 'Test' });
    await container.items.create(data);
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  buildPostData,
  sendDataToDb,
  getDbConfig
};
