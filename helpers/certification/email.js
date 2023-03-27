
const axios = require('axios');
const sendGridEmail = require('../services/sendgrid');
const certificationDatabase = require('./database')
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const { makeLinksAbsolute, getDomain } = require('../general/helper');

const resolveMacros = (text, macros) => {
  return text.replace(/{[^}]+}/g, (match) => {
    return `${macros[match.replace('{', '').replace('}', '')]}`;
  });
};

const getMacrosValues = async (attempt, res) => {
  const elearningUser = require('../e-learning/user');
  const user = await elearningUser.getUser(attempt.email, false, res);
  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return await getContent.UIMessages(res);
  });
  const productName = UIMessages[0].elements.product_name.value;
  let title = attempt.test.title;
  if (title.startsWith(productName)) title = title.replace(productName, '').trim();
  return {
    UserFirstName: user?.firstName || attempt.username.split(' ')[0],
    product_name: productName,
    CertificateTitle: title,
    CertificateValidForYears: `${attempt.test.certificate_validity} year${attempt.test.certificate_validity > 1 ? 's' : ''}`,
    CertificateDownloadUrl: `/learn/get-certified/exam/${attempt.id}/certificate/`
  };
};

const getEmailInfo = async (attempt, codename, res) => {
  const emailNotifications = await cacheHandle.ensureSingle(res, 'emailNotifications', async () => {
    return await getContent.emailNotifications(res);
  });
  const template = emailNotifications.find(item => item.system.codename === codename);
  if (!template) return null;

  const macros = await getMacrosValues(attempt, res);

  return {
    recipient: attempt.email,
    sender_name: template.elements.sender_name.value || 'Kontent.ai Learn',
    subject: resolveMacros(template.elements.subject.value, macros),
    text: makeLinksAbsolute(getDomain(), resolveMacros(template.elements.content.value, macros)),
  };
};

const sendCongrats = async (attempt, res) => {
  const expirationValid = new Date(attempt.certificate_expiration).getTime() > new Date().getTime();
  if (!(attempt.score >= attempt.test.score_to_pass && attempt.end && expirationValid && !attempt.email_notifications.congrats)) return;

  const emailInfo = await getEmailInfo(attempt, 'email_certificate_ready_for_download', res);
  const emailSent = await sendGridEmail.send(emailInfo);
  if (!emailSent) return;
  attempt.email_notifications.congrats = new Date().toISOString();
  certificationDatabase.updateAttempt(attempt);
};

const sendExpirationAhead = async (attempt, res) => {
  const expirationValid = new Date(attempt.certificate_expiration).getTime() < new Date().getTime() + 86400000 * 7;
  if (!(attempt.score >= attempt.test.score_to_pass && attempt.end && expirationValid && !attempt.email_notifications.expriration_ahead)) return;

  const emailInfo = await getEmailInfo(attempt, 'email_certificate_expires_soon', res);
  const emailSent = await sendGridEmail.send(emailInfo);
  if (!emailSent) return;
  attempt.email_notifications.expriration_ahead = new Date().toISOString();
  certificationDatabase.updateAttempt(attempt);
};

const sendExpired = async (attempt, res) => {
  const expirationValid = new Date(attempt.certificate_expiration).getTime() < new Date().getTime();
  if (!(attempt.score >= attempt.test.score_to_pass && attempt.end && expirationValid && !attempt.email_notifications.expired)) return;

  const emailInfo = await getEmailInfo(attempt, 'email_certificate_expired', res);
  const emailSent = await sendGridEmail.send(emailInfo);
  if (!emailSent) return;
  attempt.email_notifications.expired = new Date().toISOString();
  certificationDatabase.updateAttempt(attempt);
};

const handleExpirations = async (res) => {
  const attempts = await certificationDatabase.getExpirationAttempts();
  if (!attempts) return;
  for (const attempt of attempts) {
    if ((process.env.IS_PRODUCTION === 'false' && (attempt.email.endsWith('@milanlund.com') || attempt.email.endsWith('@kontent.ai'))) || process.env.IS_PRODUCTION !== 'false') {
      await sendExpirationAhead(attempt, res);
      await sendExpired(attempt, res);
    }
  }
};

const handleExpirationNotifications = async () => {
  await axios.post(`${process.env.BASE_URL}/learn/api/e-learning/expiration-notifications/`, {});
};

module.exports = {
  sendCongrats,
  handleExpirations,
  handleExpirationNotifications,
  getEmailInfo
};
