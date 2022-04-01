
const axios = require('axios');
const sendSendGridEmail = require('../sendgrid');
const certificationDatabase = require('./database')
const elearningUser = require('../e-learning/user');
const handleCache = require('../handleCache');
const commonContent = require('../commonContent');
const helper = require('../helperFunctions');

const resolveMacros = (text, macros) => {
  return text.replace(/{[^}]+}/g, (match) => {
    return `${macros[match.replace('{', '').replace('}', '')]}`;
  });
};

const getMacrosValues = async (attempt, res) => {
  const { user } = await elearningUser.getUser(attempt.email, res);
  const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return await commonContent.getUIMessages(res);
  });
  const productName = UIMessages[0].product_name.value;
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
  const emailNotifications = await handleCache.ensureSingle(res, 'emailNotifications', async () => {
    return await commonContent.getEmailNotifications(res);
  });
  const template = emailNotifications.find(item => item.system.codename === codename);
  if (!template) return null;

  const macros = await getMacrosValues(attempt, res);

  return {
    recipient: attempt.email,
    sender_name: template.sender_name.value || 'Kontent Learn',
    subject: resolveMacros(template.subject.value, macros),
    text: helper.makeLinksAbsolute(helper.getDomain(), resolveMacros(template.content.value, macros)),
  };
};

const sendCongrats = async (attempt, res) => {
  const expirationValid = new Date(attempt.certificate_expiration).getTime() > new Date().getTime();
  if (!(attempt.score >= attempt.test.score_to_pass && attempt.end && expirationValid && !attempt.email_notifications.congrats)) return;

  const emailInfo = await getEmailInfo(attempt, 'email_certificate_ready_for_download', res);
  const emailSent = await sendSendGridEmail(emailInfo);
  if (!emailSent) return;
  attempt.email_notifications.congrats = new Date().toISOString();
  certificationDatabase.updateAttempt(attempt);
};

const sendExpirationAhead = async (attempt, res) => {
  const expirationValid = new Date(attempt.certificate_expiration).getTime() < new Date().getTime() + 86400000 * 7;
  if (!(attempt.score >= attempt.test.score_to_pass && attempt.end && expirationValid && !attempt.email_notifications.expriration_ahead)) return;

  const emailInfo = await getEmailInfo(attempt, 'email_certificate_expires_soon', res);
  const emailSent = await sendSendGridEmail(emailInfo);
  if (!emailSent) return;
  attempt.email_notifications.expriration_ahead = new Date().toISOString();
  certificationDatabase.updateAttempt(attempt);
};

const sendExpired = async (attempt, res) => {
  const expirationValid = new Date(attempt.certificate_expiration).getTime() < new Date().getTime();
  if (!(attempt.score >= attempt.test.score_to_pass && attempt.end && expirationValid && !attempt.email_notifications.expired)) return;

  const emailInfo = await getEmailInfo(attempt, 'email_certificate_expired', res);
  const emailSent = await sendSendGridEmail(emailInfo);
  if (!emailSent) return;
  attempt.email_notifications.expired = new Date().toISOString();
  certificationDatabase.updateAttempt(attempt);
};

const handleExpirations = async (res) => {
  const attempts = await certificationDatabase.getExpirationAttempts();
  if (!attempts) return;
  for (const attempt of attempts) {
    if ((process.env.isProduction === 'false' && (attempt.email.endsWith('@milanlund.com') || attempt.email.endsWith('@kentico.com'))) || process.env.isProduction !== 'false') {
      await sendExpirationAhead(attempt, res);
      await sendExpired(attempt, res);
    }
  }
};

const handleExpirationNotifications = async () => {
  await axios.post(`${process.env.baseURL}/learn/api/e-learning/expiration-notifications`, {});
};

module.exports = {
  sendCongrats,
  handleExpirations,
  handleExpirationNotifications,
  getEmailInfo
};
