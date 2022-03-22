const helper = require('../helperFunctions');
const cheerio = require('cheerio');

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

const orderLinkedItemCodenames = (orderedMarkup) => {
  const $ = cheerio.load(orderedMarkup);

  const $items = $('object[data-codename]');
  const itemCodenames = [];
  $items.each(function () {
    itemCodenames.push($(this).attr('data-codename'));
  });

  return itemCodenames;
};

const getQuestions = (survey) => {
  const items = [];
  const linkedItems = survey.linkedItems;

  survey.items[0].survey_questions.linkedItemCodenames = orderLinkedItemCodenames(survey.items[0]._raw.elements.survey_questions.value)

  for (let i = 0; i < survey.items[0].survey_questions.linkedItemCodenames.length; i++) {
    const question = linkedItems[survey.items[0].survey_questions.linkedItemCodenames[i]];
    const questionItem = {
      id: question.system.id,
      codename: question.system.codename,
      name: helper.removeUnnecessaryWhitespace(helper.removeNewLines(helper.removeQuotes(helper.stripTags(question.question.value)))).trim(),
      html: question.question.value,
      answers: [],
      type: question.system.type,
      text_answer: null
    };

    if (question.answers) {
      question.answers.linkedItemCodenames = orderLinkedItemCodenames(question._raw.elements.answers.value)
      for (let j = 0; j < question.answers.linkedItemCodenames.length; j++) {
        const answer = linkedItems[question.answers.linkedItemCodenames[j]];
        const answerItem = {
          id: answer.system.id,
          codename: answer.system.codename,
          name: helper.removeUnnecessaryWhitespace(helper.removeNewLines(helper.removeQuotes(helper.stripTags(answer.answer.value)))).trim(),
          html: answer.answer.value,
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
