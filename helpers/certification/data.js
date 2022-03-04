const handleCache = require('../handleCache');
const commonContent = require('../commonContent');
const helper = require('../helperFunctions');

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

const removeCorrectness = (data) => {
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

const getTest = async (codename, res) => {
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

module.exports = {
  evaluateAttempt,
  getTest,
  removeCorrectness
};
