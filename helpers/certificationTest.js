const cosmos = require('./cosmos');
const handleCache = require('./handleCache');
const commonContent = require('./commonContent');
const helper = require('./helperFunctions');

const successfullAttemptExists = async (body, res) => {
  const { codename, email } = body;
  let attempt = null;

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT);
    const query = {
        query: 'SELECT * FROM c WHERE c.email = @email AND c.test.codename = @codename AND c.certificate_expiration > @expiration',
        parameters: [{
          name: '@email',
          value: email
        }, {
          name: '@codename',
          value: codename
        }, {
          name: '@expiration',
          value: new Date().toISOString()
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
    const date = new Date()
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
      const certificationTestData = await getCertificationTestData(codename, res);

      attempt = await db.items.create({
        email: email,
        username: username,
        start: new Date().toISOString(),
        end: null,
        score: null,
        certificate_expiration: null,
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
  const questions = [];

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
              correct: !!allQuestions.items[i].answers.linkedItems_custom[m].is_this_a_correct_answer_.value.length,
              answer: false
            })
          }

          questions[k].questions.push(question);
        }
      }
    }
  };

  return pickRandomQuestions(questions, certificationTest.question_count.value, allQuestions.items.length);
}

const removeCorrectnessFromCertificationTestData = (data) => {
  for (let i = 0; i < data.questions.length; i++) {
    for (let j = 0; j < data.questions[i].questions.length; j++) {
      for (let k = 0; k < data.questions[i].questions[j].answers.length; k++) {
        delete data.questions[i].questions[j].answers[k].correct;
        delete data.questions[i].questions[j].answers[k].answer;
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
    codename: codename,
    title: certificationTest.title.value,
    duration: parseInt(certificationTest.test_duration.value),
    questions_count: certificationTest.question_count.value,
    questions: questions
   };
};

const evaluateAttempt = (body, attempt) => {
  attempt.end = new Date().toISOString();
  let correctAnswers = 0;

  for (const property in body) {
    if (Object.prototype.hasOwnProperty.call(body, property)) {
      for (let i = 0; i < attempt.test.questions.length; i++) {
        for (let j = 0; j < attempt.test.questions[i].questions.length; j++) {
          if (attempt.test.questions[i].questions[j].codename === property) {
            for (let k = 0; k < attempt.test.questions[i].questions[j].answers.length; k++) {
              if (attempt.test.questions[i].questions[j].answers[k].codename === body[property]) {
                attempt.test.questions[i].questions[j].answers[k].answer = true;

                if (attempt.test.questions[i].questions[j].answers[k].answer === true &&
                  attempt.test.questions[i].questions[j].answers[k].correct === true
                  ) {
                    correctAnswers++;
                  }
              }
            }
          }
        }
      }
    }
  }

  attempt.score = Math.floor(correctAnswers / attempt.test.questions_count * 100);

  if (attempt.score >= 80) {
    const date = new Date()
    date.setDate(date.getDate() + 365);
    attempt.certificate_expiration = date.toISOString();
  }

  return attempt;
};

const initAttempt = async (body, res) => {
  const successfullAttempt = await successfullAttemptExists(body);
  if (successfullAttempt) {
    return {
      code: 302,
      data: successfullAttempt
    }
  }

  const attempt = await checkCreateAttempt(body, res);
  let code = 403;

  if (attempt && attempt.resource) {
    const attemptStart = new Date(attempt.resource.start);
    const attemptStartDurationMs = attemptStart.getTime() + attempt.resource.test.duration * 60000;
    const nowMs = (new Date()).getTime();
    if (attemptStartDurationMs > nowMs && !attempt.resource.end) {
      code = 200;
    }
    attempt.resource.test = removeCorrectnessFromCertificationTestData(attempt.resource.test);
  }

  return {
    code: code,
    data: attempt.resource
  };
};

const handleAttempt = async (body) => {
  let attempt = await getAttempt(body.attempt);
  if (!attempt) return null;
  attempt = evaluateAttempt(body, attempt);
  updateAttempt(attempt);

  return attempt;
};

const getNextAttemptSeconds = (date) => {
  const attemptStart = new Date(date);
  attemptStart.setDate(attemptStart.getDate() + 1);
  const now = new Date();
  return Math.round((attemptStart - now) / 1000);
}

module.exports = {
  initAttempt,
  handleAttempt,
  getAttempt,
  getNextAttemptSeconds
};
