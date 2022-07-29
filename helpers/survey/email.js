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

const sendNotification = async (attempt) => {
  const recipient = process.env.SENDGRID_EMAIL_ADDRESS_SURVEY_NOTIFICATION_TO;
  if (!recipient || !attempt) return;
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
