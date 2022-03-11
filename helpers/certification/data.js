const handleCache = require('../handleCache');
const commonContent = require('../commonContent');
const helper = require('../helperFunctions');

const buildQuestionsObject = (certificationTest, certificationTestLinkedItems) => {
  const questionsBuild = [];

  for (let f = 0; f < certificationTest.question_groups.value.length; f++) {
    questionsBuild.push({
      topic: {
        name: certificationTest.question_groups.value[f].system.name,
        codename: certificationTest.question_groups.value[f].system.codename,
      },
      questions: []
    });

    let questionsNumber = parseInt(certificationTest.question_groups.value[f].number_of_questions.value);
    if (isNaN(questionsNumber)) questionsNumber = 0;

    const questions = certificationTest.question_groups.value[f].questions.value.map(a => { return { ...a } }); // Deep copy

    while (questions.length > questionsNumber) {
      const currentQuestionsNumber = questions.length;
      const randomIndex = Math.floor(Math.random() * currentQuestionsNumber);
      questions.splice(randomIndex, 1);
    }

    for (let i = 0; i < questions.length; i++) {
      const question = {
        codename: questions[i].system.codename,
        name: helper.removeUnnecessaryWhitespace(helper.removeNewLines(helper.removeQuotes(helper.stripTags(certificationTest.question_groups.value[f].questions.value[i].question.value)))).trim(),
        html: questions[i].question.value,
        answers: []
      }

      for (let j = 0; j < questions[i].answers.linkedItemCodenames.length; j++) {
        const answer = certificationTestLinkedItems[questions[i].answers.linkedItemCodenames[j]];

        question.answers.push({
          codename: answer.system.codename,
          name: helper.removeUnnecessaryWhitespace(helper.removeNewLines(helper.removeQuotes(helper.stripTags(answer.answer.value)))).trim(),
          html: answer.answer.value,
          correct: !!answer.is_this_a_correct_answer_.value.length,
          answer: false
        })
      }

      questionsBuild[f].questions.push(question);
    }
  }

  return questionsBuild;
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
  if (!(certificationTest.items && certificationTest.items.length)) return null;
  const certificationTestLinkedItems = certificationTest.linkedItems;
  certificationTest = certificationTest.items[0];

  const questions = buildQuestionsObject(certificationTest, certificationTestLinkedItems);
  let testQuestionsNumber = 0;
  certificationTest.question_groups.value.forEach(item => { testQuestionsNumber += item.number_of_questions.value });

  return {
    codename: codename,
    title: certificationTest.title.value,
    duration: parseInt(certificationTest.test_duration.value),
    questions_count: testQuestionsNumber,
    score_to_pass: certificationTest.score_to_pass.value,
    certificate_validity: certificationTest.certificate_validity.value,
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

  if (attempt.score >= attempt.test.score_to_pass) {
    const date = new Date()
    date.setDate(date.getDate() + ((attempt.test.certificate_validity * 365) || 365));
    attempt.certificate_expiration = date.toISOString();
  }

  return attempt;
};

module.exports = {
  evaluateAttempt,
  getTest,
  removeCorrectness
};
