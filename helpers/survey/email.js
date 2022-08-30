const sendGridEmail = require('../services/sendgrid');

const findAnswer = (question) => {
  let answer = 'No answer';
  if (question.answers.length) {
    const selectedAnswer = question.answers.find((item) => item.selected);
    if (selectedAnswer) answer = selectedAnswer.name;
  } else if (question.text_answer) {
    answer = question.text_answer;
  }
  return answer;
};

const createNotification = (attempt) => {
  let notification = '';

  attempt.questions.forEach((item) => {
    notification += `<b>${item.name}:</b> ${findAnswer(item)}<br>`;
  });

  notification += `<br>${attempt.email}<br>${attempt.end}`;
  return notification;
};

const attemptHasAnswer = (attempt) => {
  let hasAnswer = false;
  attempt.questions.forEach((question) => {
    if (question.answers.length) {
      const selectedAnswer = question.answers.find((item) => item.selected);
      if (selectedAnswer) hasAnswer = true;
    } else if (question.text_answer) {
      hasAnswer = true;
    }
  });
  return hasAnswer;
};

const sendNotification = async (attempt) => {
  const recipient = process.env.SENDGRID_EMAIL_ADDRESS_SURVEY_NOTIFICATION_TO;
  if (!recipient || !attempt || !attemptHasAnswer(attempt)) return;
  const notification = createNotification(attempt);
  await sendGridEmail.send({
    recipient: recipient,
    sender_name: attempt.username,
    subject: `${attempt.username} - ${attempt.course_title}`,
    text: notification,
  });
};

module.exports = {
  sendNotification
};
