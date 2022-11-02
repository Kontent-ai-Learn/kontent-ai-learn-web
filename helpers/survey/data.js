const {
  removeNewLines,
  removeQuotes,
  removeUnnecessaryWhitespace,
  stripTags
} = require('../general/helper');

const evaluateAttempt = (body, attempt) => {
  attempt.end = new Date().toISOString();

  for (const prop in body) {
    if (Object.prototype.hasOwnProperty.call(body, prop)) {
      for (let i = 0; i < attempt.questions.length; i++) {
        if (attempt.questions[i].id === prop) {
          if (attempt.questions[i].type === 'training_question_for_survey_and_test') {
            for (let j = 0; j < attempt.questions[i].answers.length; j++) {
              if (attempt.questions[i].answers[j].id === body[prop]) {
                attempt.questions[i].answers[j].selected = true;
              }
            }
          } else if (attempt.questions[i].type === 'training_question_free_text') {
            attempt.questions[i].text_answer = body[prop];
          }
        }
      }
    }
  }

  return attempt;
};

const getQuestions = (survey) => {
  if (!survey.items.length) return null;
  const items = [];

  for (let i = 0; i < survey.items[0].elements.survey_questions.linkedItems.length; i++) {
    const question = survey.items[0].elements.survey_questions.linkedItems[i];
    const questionItem = {
      id: question.system.id,
      codename: question.system.codename,
      name: removeUnnecessaryWhitespace(removeNewLines(removeQuotes(stripTags(question.elements.question.value)))).trim(),
      html: question.elements.question.value,
      answers: [],
      type: question.system.type,
      text_answer: null
    };

    if (question.elements.answers) {
      for (let j = 0; j < question.elements.answers.linkedItems.length; j++) {
        const answer = question.elements.answers.linkedItems[j];
        const answerItem = {
          id: answer.system.id,
          codename: answer.system.codename,
          name: removeUnnecessaryWhitespace(removeNewLines(removeQuotes(stripTags(answer.elements.answer.value)))).trim(),
          html: answer.elements.answer.value,
          selected: false,
        }

        questionItem.answers.push(answerItem);
      }
    }

    items.push(questionItem);
  }

  return items;
};

module.exports = {
  getQuestions,
  evaluateAttempt
};
