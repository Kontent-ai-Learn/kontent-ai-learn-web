const cosmos = require('./cosmos');

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
  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_SURVEY);
    await db.items.create(data);
  } catch (error) {
    cosmos.logAppInsightsError(error);
  }
};

module.exports = {
  buildPostData,
  sendDataToDb
};
