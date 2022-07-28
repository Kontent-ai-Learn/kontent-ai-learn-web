const moment = require('moment');
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const certificationDatabase = require('./database');
const helper = require('../general/helper')

const getCertificateData = (attempt, certificationTest) => {
  return {
    url: `/learn/get-certified/exam/${attempt.id}/certificate/`,
    issued: moment(attempt.end).format('YYYY/MM/DD'),
    expiration: moment(attempt.certificate_expiration).format('YYYY/MM/DD'),
    name: certificationTest.title.value
  }
};

const getCertificationInfoByAttemptId = async (attemptId, certificationTest) => {
  const attempt = await certificationDatabase.getAttempt(attemptId);
  if (!attempt) return null;
  const result = {
    signedIn: true
  };
  const now = moment();
  const expiration = moment(attempt.certificate_expiration);
  const dateDiff = expiration.diff(now, 'days');

  if (dateDiff >= 0) {
    result.certificate = getCertificateData(attempt, certificationTest)
  }
  return result;
};

const getCertificationInfo = async (user, certificationTest) => {
  const successfullAttempt = await certificationDatabase.successfullAttemptExists({
    email: user?.email,
    codename: certificationTest.system.codename
  });
  if (successfullAttempt) {
    const result = {
      certificate: getCertificateData(successfullAttempt, certificationTest),
      id: certificationTest.system.id
    };

    const now = moment();
    const expiration = moment(successfullAttempt.certificate_expiration);
    const dateDiff = expiration.diff(now, 'days');
    if (dateDiff < 7) {
      result.label = 'Start exam';
      result.url = `/learn/get-certified/${certificationTest.url.value}/`;
      result.renderAs = 'button';
    } else {
      result.message = 'You have successfully passed the exam.';
      result.renderAs ='text';
    }
    return result;
  }

  const attemptInPastDay = await certificationDatabase.checkAttemptInPastDay(user?.email, certificationTest.system.codename);

  if (attemptInPastDay && attemptInPastDay.length) {
    const attemptStart = new Date(attemptInPastDay[0].start);
    const attemptStartDurationMs = attemptStart.getTime();
    const nowMs = (new Date()).getTime();

    if ((attemptStartDurationMs < nowMs && !attemptInPastDay[0].certificate_expiration) || (attemptStartDurationMs >= nowMs && attemptInPastDay[0].end)) {
      const nextAttemptDateTime = (new Date(attemptStartDurationMs + 86400000)).toISOString();
      return {
        id: certificationTest.system.id,
        message: `You didn’t pass this time. You can try again in <span data-timer-date="${nextAttemptDateTime}"></span>.`,
      }
    }
  }

  return {
    id: certificationTest.system.id,
    label: 'Start exam',
    url: `/learn/get-certified/${certificationTest.url.value}/`,
    target: '_self',
    attr: 'data-once',
  };
};

const getPrivate = async (UIMessages, certificationTest, req, res) => {
  const elearningUser = require('../e-learning/user');
  const data = {};
  const user = await elearningUser.getUser(req?.user?.email, res);

  if (user.code) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = user.code === 'CR404' ? 'sign_in_error_subscription_missing_text' : 'sign_in_error_text';
    data.renderAs = 'plaintext';
  } else if (!(await elearningUser.isCourseAvailable(user, certificationTest, res))) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = 'training___cta_buy_course';
    data.action = 'intercom';
    data.renderAs = 'button';
    data.certificate = null // TBD
    data.signedIn = true;
  }

  data.text = data.textUIMessageCodename ? UIMessages[data.textUIMessageCodename].value : '';

  const certificationInfo = await getCertificationInfo(user, certificationTest);

  return {
    general: data.renderGeneralMessage ? data : null,
    production: !data.renderGeneralMessage && user ? certificationInfo : null
  }
};

const getPublic = (UIMessages) => {
  const data = {};
  data.text = helper.getValue(UIMessages, 'sign_in_button');
  data.textUIMessageCodename = 'sign_in_button';
  data.id = 'login';
  data.renderAs = 'button';

  return { general: data };
};

const get = async (codename, req, res) => {
  let data = null;
  const certificationTest = await cacheHandle.evaluateSingle(res, codename, async () => {
    return await getContent.certificationTest(res, codename);
  });
  const UIMessagesObj = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return await getContent.UIMessages(res);
  });

  const UIMessages = UIMessagesObj && UIMessagesObj.length ? UIMessagesObj[0] : null;

  if (req.user) {
    data = await getPrivate(UIMessages, certificationTest.items[0], req, res);
  } else {
    data = getPublic(UIMessages);
  }
  return data;
};

const getByAttemptId = async (codename, attemptId, res) => {
  const certificationTest = await cacheHandle.evaluateSingle(res, codename, async () => {
    return await getContent.certificationTest(res, codename);
  });

  return {
    general: null,
    production: await getCertificationInfoByAttemptId(attemptId, certificationTest.items[0])
  }
}

module.exports = {
  get,
  getByAttemptId,
  getCertificationInfo
};
