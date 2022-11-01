const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const { removeUnnecessaryWhitespace, removeNewLines, removeQuotes, stripTags } = require('../general/helper');

const buildQuestionsObject = (certificationTest, certificationTestLinkedItems) => {
  const questionsBuild = [];

  for (let f = 0; f < certificationTest.elements.question_groups.linkedItems.length; f++) {
    questionsBuild.push({
      topic: {
        id: certificationTest.elements.question_groups.linkedItems[f].system.id,
        codename: certificationTest.elements.question_groups.linkedItems[f].system.codename,
        name: certificationTest.elements.question_groups.linkedItems[f].system.name
      },
      questions: []
    });

    let questionsNumber = parseInt(certificationTest.elements.question_groups.linkedItems[f].elements.number_of_questions.value);
    if (isNaN(questionsNumber)) questionsNumber = 0;

    const questions = certificationTest.elements.question_groups.linkedItems[f].elements.questions.linkedItems.map(a => { return { ...a } }); // Deep copy

    while (questions.length > questionsNumber) {
      const currentQuestionsNumber = questions.length;
      const randomIndex = Math.floor(Math.random() * currentQuestionsNumber);
      questions.splice(randomIndex, 1);
    }

    for (let i = 0; i < questions.length; i++) {
      const question = {
        id: questions[i].system.id,
        codename: questions[i].system.codename,
        name: removeUnnecessaryWhitespace(removeNewLines(removeQuotes(stripTags(certificationTest.elements.question_groups.linkedItems[f].elements.questions.linkedItems[i].elements.question.value)))).trim(),
        html: questions[i].elements.question.value,
        answers: []
      }

      for (let j = 0; j < questions[i].elements.answers.linkedItemCodenames.length; j++) {
        const answer = certificationTestLinkedItems[questions[i].elements.answers.linkedItemCodenames[j]];

        question.answers.push({
          id: answer.system.id,
          codename: answer.system.codename,
          name: removeUnnecessaryWhitespace(removeNewLines(removeQuotes(stripTags(answer.elements.answer.value)))).trim(),
          html: answer.elements.answer.value,
          correct: !!answer.elements.is_this_a_correct_answer_.value.length,
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
  let certificationTest = await cacheHandle.evaluateSingle(res, codename, async () => {
    return await getContent.certificationTest(res, codename);
  });
  if (!(certificationTest.items && certificationTest.items.length)) return null;
  const certificationTestLinkedItems = certificationTest.linkedItems;
  certificationTest = certificationTest.items[0];

  const questions = buildQuestionsObject(certificationTest, certificationTestLinkedItems);
  let testQuestionsNumber = 0;
  certificationTest.elements.question_groups.linkedItems.forEach(item => { testQuestionsNumber += item.elements.number_of_questions.value });

  return {
    id: certificationTest.system.id,
    codename: codename,
    title: certificationTest.elements.title.value,
    duration: parseInt(certificationTest.elements.test_duration.value),
    questions_count: testQuestionsNumber,
    score_to_pass: certificationTest.elements.score_to_pass.value,
    certificate_validity: certificationTest.elements.certificate_validity.value,
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

const getIncorrect = (attempt) => {
  if (!attempt?.test?.questions) return null;

  const incorrect = [];

  for (let i = 0; i < attempt.test.questions.length; i++) {
    for (let j = 0; j < attempt.test.questions[i].questions.length; j++) {
      const anyAnswer = attempt.test.questions[i].questions[j].answers.find(answer => answer.answer);
      if (anyAnswer) {
        const incorrectAnswer = attempt.test.questions[i].questions[j].answers.find(answer => !answer.correct && answer.answer);
        if (incorrectAnswer) {
          incorrect.push({
            question: attempt.test.questions[i].questions[j].html,
            answer: incorrectAnswer.html,
          });
        }
      }
    }
  }
  return incorrect;
};

module.exports = {
  evaluateAttempt,
  getTest,
  removeCorrectness,
  getIncorrect
};
