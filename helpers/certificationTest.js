const { CosmosClient } = require('@azure/cosmos');
const app = require('../app');
const handleCache = require('./handleCache');
const commonContent = require('./commonContent');
const helper = require('./helperFunctions');

const checkCreateAttempt = async (codename, email, res) => {
  let attempt = null;
  const client = new CosmosClient({ endpoint: process.env.COSMOSDB_ENDPOINT, key: process.env.COSMOSDB_KEY });

  try {
    const { database } = await client.databases.createIfNotExists({ id: process.env.COSMOSDB_DATABASE });
    const { container } = await database.containers.createIfNotExists({ id: process.env.COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT });

    const date = new Date()
    date.setDate(date.getDate() - 1); // !!!! Change this to 1 before pushing to repo
    const timestamp = date.toISOString();

    const query = {
        query: 'SELECT * FROM c WHERE c.email = @email AND c.codename = @codename AND c.timestamp > @timestamp',
        parameters: [{
          name: '@email',
          value: email
        }, {
          name: '@codename',
          value: codename
        }, {
          name: '@timestamp',
          value: timestamp
        }]
    };

    const { resources } = await container.items.query(query).fetchAll();
    if (!(resources && resources.length)) {
      const certificationTestData = await getCertificationTestData(codename, res);

      attempt = await container.items.create({
        email: email,
        codename: codename,
        timestamp: new Date().toISOString(),
        test: certificationTestData
      });
    } else {
      attempt = {};
      attempt.resource = resources[0];
    }
  } catch (error) {
    if (app.appInsights) {
      app.appInsights.defaultClient.trackTrace({ message: 'COSMOSDB_ERROR: ' + error });
    }
  }

  return attempt;
};

const pickRandomQuestions = (questions, formQuestionsNumber, allQuestionsNumber) => {
  let totalQuestionsNumber = 0;
  formQuestionsNumber = parseInt(formQuestionsNumber);
  allQuestionsNumber = parseInt(allQuestionsNumber);

  for (let i = 0; i < questions.length; i++) {
    const topicQuestionsNumber = questions[i].questions.length;
    let topicTargetQuestionsNumber = Math.round(formQuestionsNumber / allQuestionsNumber * topicQuestionsNumber);
    totalQuestionsNumber += topicTargetQuestionsNumber;

    if (totalQuestionsNumber > formQuestionsNumber) {
      topicTargetQuestionsNumber = topicTargetQuestionsNumber - totalQuestionsNumber + formQuestionsNumber;
    }

    while (questions[i].questions.length > topicTargetQuestionsNumber) {
      const currentQuestionsNumber = questions[i].questions.length;
      const randomIndex = Math.floor(Math.random() * currentQuestionsNumber);
      questions[i].questions.splice(randomIndex, 1);
    }
  }
  return questions;
};

const buildQuestionsObject = (certificationTest, allQuestions) => {
  let questions = [];

  for (let i = 0; i < certificationTest.training_questions.value.length; i++) {
    questions.push({
      topic: {
        name: certificationTest.training_questions.value[i].name,
        codename: certificationTest.training_questions.value[i].codename,
      },
      questions: []
    })
  }

  for (let i = 0; i < allQuestions.items.length; i++) {
    const answerCodenames = allQuestions.items[i].answers.linkedItemCodenames;
    allQuestions.items[i].answers.linkedItems_custom = [];
    for (let j = 0; j < answerCodenames.length; j++) {
      allQuestions.items[i].answers.linkedItems_custom.push(allQuestions.linkedItems[answerCodenames[j]]);
    }

    for (let j = 0; j < allQuestions.items[i].training_questions.value.length; j++) {
      for (let k = 0; k < questions.length; k++) {
        if (questions[k].topic.codename === allQuestions.items[i].training_questions.value[j].codename) {
          const question = {
            codename: allQuestions.items[i].system.codename,
            name: helper.removeUnnecessaryWhitespace(helper.removeNewLines(helper.removeQuotes(helper.stripTags(allQuestions.items[i].question.value)))).trim(),
            html: allQuestions.items[i].question.value,
            answers: []
          }

          for (let m = 0; m < allQuestions.items[i].answers.linkedItems_custom.length; m++) {
            question.answers.push({
              codename: allQuestions.items[i].answers.linkedItems_custom[m].system.codename,
              name: helper.removeUnnecessaryWhitespace(helper.removeNewLines(helper.removeQuotes(helper.stripTags(allQuestions.items[i].answers.linkedItems_custom[m].answer.value)))).trim(),
              html: allQuestions.items[i].answers.linkedItems_custom[m].answer.value,
              correct: !!allQuestions.items[i].answers.linkedItems_custom[m].is_this_a_correct_answer_.value.length
            })
          }

          questions[k].questions.push(question);
        }
      }
    }
  };

  questions = pickRandomQuestions(questions, certificationTest.question_count.value, allQuestions.items.length);

  return questions;
}

const removeCorrectnessFromCertificationTestData = (data) => {
  for (let i = 0; i < data.questions.length; i++) {
    for (let j = 0; j < data.questions[i].questions.length; j++) {
      for (let k = 0; k < data.questions[i].questions[j].answers.length; k++) {
        delete data.questions[i].questions[j].answers[k].correct;
      }
    }
  }

  return data;
};

const getCertificationTestData = async (codename, res) => {
  let certificationTest = await handleCache.evaluateSingle(res, codename, async () => {
    return await commonContent.getCertificationTest(res, codename);
  });
  const allQuestions = await handleCache.evaluateSingle(res, 'trainingQuestions', async () => {
    return await commonContent.getTrainingQuestions(res, codename);
  });
  if (!(certificationTest.length && allQuestions.items.length)) return null;
  certificationTest = certificationTest[0];

  const questions = buildQuestionsObject(certificationTest, allQuestions);

  return {
    title: certificationTest.title.value,
    duration: parseInt(certificationTest.test_duration.value),
    questions: questions
   };
};

const getData = async (codename, email, req, res) => {
  const attempt = await checkCreateAttempt(codename, email, res);
  let code = 403;

  if (attempt && attempt.resource) {
    const attemptStart = new Date(attempt.resource.timestamp);
    const attemptStartDurationMs = attemptStart.getTime() + attempt.resource.test.duration * 60000;
    const nowMs = (new Date()).getTime();
    if (attemptStartDurationMs > nowMs) {
      code = 200;
    }
    attempt.resource.test = removeCorrectnessFromCertificationTestData(attempt.resource.test);
  }

  return {
    code: code,
    data: attempt.resource
  };
};

module.exports = {
  getData
};
