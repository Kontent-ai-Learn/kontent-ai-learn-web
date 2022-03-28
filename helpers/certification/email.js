const sendSendGridEmail = require('../sendgrid');
const certificationDatabase = require('./database')

const congratsTemplate = (attempt) => {
  return `Congratulations, ${attempt.username},\n
You've passed the ${attempt.test.title}! Your certificate is ready anytime for you to download. Just go to Kontent E-learning <https://kontent.ai/learn/e-learning> and open the certification detail.\n
Use your email and password to Kontent to sign in. If you don't know the password, you can reset it in the sign-in dialog.\n
Have a nice day,\n
Kontent Customer Education team`;
};

const expirationAheadTemplate = (attempt) => {
  return `Hi, ${attempt.username},\n
Your ${attempt.test.title} expires in 7 days. Visit our Kontent E-learning <https://kontent.ai/learn/e-learning> and prolong the certification by taking the exam again.\n
Before taking the test, please read through the exam information to check if anything's changed. Use your email and password to Kontent to sign in. If you don't know the password, you can reset it in the sign-in dialog.\n
We wish you good luck!\n
Have a nice day,\n
Kontent Customer Education team`;
};

const expiredTemplate = (attempt) => {
  return `Hi, ${attempt.username},\n
Your ${attempt.test.title} just expired. We're sorry to see you go. If you change your mind, come back to Kontent E-learning <https://kontent.ai/learn/e-learning> and prolong it.\n
Before taking the test, please read through the exam information to check if anything's changed. Use your email and password to Kontent to sign in. If you don't know the password, you can reset it in the sign-in dialog.\n
Have a nice day,\n
Kontent Customer Education team`;
};

const sendCongrats = async (attempt) => {
  const expirationValid = new Date(attempt.certificate_expiration).getTime() > new Date().getTime();
  if (!(attempt.score >= attempt.test.score_to_pass && attempt.end && expirationValid && !attempt.email_notifications.congrats)) return;

  const emailInfo = {
    recipient: attempt.email,
    subject: `Your ${attempt.test.title} certificate is ready!`,
    text: congratsTemplate(attempt)
  };

  const emailSent = await sendSendGridEmail(emailInfo);
  if (!emailSent) return;
  attempt.email_notifications.congrats = new Date().toISOString();
  certificationDatabase.updateAttempt(attempt);
};

const sendExpirationAhead = async (attempt) => {
  const expirationValid = new Date(attempt.certificate_expiration).getTime() < new Date().getTime() + 86400000 * 7;
  if (!(attempt.score >= attempt.test.score_to_pass && attempt.end && expirationValid && !attempt.email_notifications.expriration_ahead)) return;

  const emailInfo = {
    recipient: attempt.email,
    subject: `Your ${attempt.test.title} is going to expire!`,
    text: expirationAheadTemplate(attempt)
  };

  const emailSent = await sendSendGridEmail(emailInfo);
  if (!emailSent) return;
  attempt.email_notifications.expriration_ahead = new Date().toISOString();
  certificationDatabase.updateAttempt(attempt);
};

const sendExpired = async (attempt) => {
  const expirationValid = new Date(attempt.certificate_expiration).getTime() < new Date().getTime();
  if (!(attempt.score >= attempt.test.score_to_pass && attempt.end && expirationValid && !attempt.email_notifications.expired)) return;

  const emailInfo = {
    recipient: attempt.email,
    subject: `Your ${attempt.test.title} has just expired!`,
    text: expiredTemplate(attempt)
  };

  const emailSent = await sendSendGridEmail(emailInfo);
  if (!emailSent) return;
  attempt.email_notifications.expired = new Date().toISOString();
  certificationDatabase.updateAttempt(attempt);
};

const handleExpirations = async () => {
  const attempts = await certificationDatabase.getExpirationAttempts();
  if (!attempts) return;
  for (const attempt of attempts) {
    if ((process.env.isProduction === 'false' && (attempt.email.endsWith('@milanlund.com') || attempt.email.endsWith('@kentico.com'))) || process.env.isProduction !== 'false') {
      await sendExpirationAhead(attempt);
      await sendExpired(attempt);
    }
  }
};

module.exports = {
  sendCongrats,
  handleExpirations
};
