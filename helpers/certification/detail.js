const moment = require('moment');

const handleCache = require('../handleCache');
const commonContent = require('../commonContent');
const elearningUser = require('../e-learning/user');
const certificationDatabase = require('./database');
const certificationAttempt = require('./attempt');

const getCertificationInfo = async (user, certificationTest, UIMessages, req, res) => {
  const successfullAttempt = await certificationDatabase.successfullAttemptExists({
    email: user?.email,
    codename: certificationTest.system.codename
  });

  if (successfullAttempt) {
    return {
      text: 'You have successfully passed the exam.',
      renderAs: 'text',
      certificate: {
        public_url: `/learn/get-certified/exam/${successfullAttempt.id}/certificate/`,
        issued_date: moment(successfullAttempt.end).format('YYYY/MM/DD'),
        expiration_date: moment(successfullAttempt.certificate_expiration).format('YYYY/MM/DD'),
        course_name: successfullAttempt.test.title
      },
      signedIn: true
    }
  }

  const attemptInPastDay = await certificationDatabase.checkAttemptInPastDay(user?.email, certificationTest.system.codename);

  if (attemptInPastDay && attemptInPastDay.length) {
    const attemptStart = new Date(attemptInPastDay[0].start);
    const attemptStartDurationMs = attemptStart.getTime() + attemptInPastDay[0].test.duration * 60000;
    const nowMs = (new Date()).getTime();

    if ((attemptStartDurationMs < nowMs && !attemptInPastDay[0].certificate_expiration) || (attemptStartDurationMs >= nowMs && attemptInPastDay[0].end)) {
      return {
        text: `You didn’t pass this time. You can try again in <span data-timer="${certificationAttempt.getNextSeconds(attemptInPastDay[0].start)}"></span>.`,
        renderAs: 'text',
        signedIn: true
      }
    }
  }

  return {
    text: 'Start exam',
    url: `/learn/get-certified/${certificationTest.url.value}/`,
    target: '_self',
    attr: 'data-once',
    renderAs: 'button',
    signedIn: true
  };
};

const getPrivate = async (UIMessages, certificationTest, req, res) => {
  const data = {};
  const user = await elearningUser.getUser(req?.user?.email, res);

  if (!user) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = 'sign_in_error_subscription_missing_text'; //errCode === 'CR404' ? 'sign_in_error_subscription_missing_text' : 'sign_in_error_text';
    data.renderAs = 'text';
  } else if (!(await elearningUser.isCourseAvailable(user, certificationTest, res))) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = 'training___cta_buy_course';
    data.action = 'intercom';
    data.renderAs = 'button';
    data.certificate = null // TBD
    data.signedIn = true;
  }

  data.text = data.textUIMessageCodename ? UIMessages[data.textUIMessageCodename].value : '';

  const certificationInfo = await getCertificationInfo(user, certificationTest, UIMessages, req, res);

  return {
    general: data.renderGeneralMessage ? data : null,
    production: !data.renderGeneralMessage && user ? certificationInfo : null
  }
};

const getPublic = (UIMessages) => {
  const data = {};
  data.text = UIMessages.sign_in_button.value;
  data.textUIMessageCodename = 'sign_in_button';
  data.id = 'login';
  data.renderAs = 'button';

  return { general: data };
};

const get = async (codename, req, res) => {
  let data = null;
  const certificationTest = await handleCache.evaluateSingle(res, codename, async () => {
    return await commonContent.getCertificationTest(res, codename);
  });
  const UIMessagesObj = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return await commonContent.getUIMessages(res);
  });

  const UIMessages = UIMessagesObj && UIMessagesObj.length ? UIMessagesObj[0] : null;

  if (req.user) {
    data = await getPrivate(UIMessages, certificationTest.items[0], req, res);
  } else {
    data = getPublic(UIMessages);
  }
  return data;
};

module.exports = {
  get
};
