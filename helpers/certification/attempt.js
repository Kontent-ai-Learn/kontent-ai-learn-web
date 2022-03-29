const certificationDatabase = require('./database');
const certificationData = require('./data');
const elearningUser = require('../e-learning/user');

const init = async (body, res) => {
  const { user, trainingUser, errCode } = await elearningUser.getUser(body.email, res);
  if (!(await elearningUser.isCourseAvailable(user, null, trainingUser, res)) || errCode) {
    return {
      code: 401,
      data: null
    }
  }

  const successfullAttempt = await certificationDatabase.successfullAttemptExists(body);
  if (successfullAttempt) {
    return {
      code: 302,
      data: successfullAttempt
    }
  }

  const attempt = await certificationDatabase.checkCreateAttempt(body, res);
  let code = 403;

  if (attempt && attempt.resource) {
    const attemptStart = new Date(attempt.resource.start);
    const attemptStartDurationMs = attemptStart.getTime() + attempt.resource.test.duration * 60000;
    const nowMs = (new Date()).getTime();
    if (attemptStartDurationMs > nowMs && !attempt.resource.end) {
      code = 200;
    }
    attempt.resource.test = certificationData.removeCorrectness(attempt.resource.test);
  }

  return {
    code: code,
    data: attempt.resource
  };
};

const handle = async (body) => {
  let attempt = await certificationDatabase.getAttempt(body.attempt);
  if (!attempt || attempt.end) return null;
  attempt = certificationData.evaluateAttempt(body, attempt);
  await certificationDatabase.updateAttempt(attempt);

  return attempt;
};

const get = async (id) => {
  return certificationDatabase.getAttempt(id);
};

const getNextSeconds = (date) => {
  const attemptStart = new Date(date);
  attemptStart.setDate(attemptStart.getDate() + 1);
  const now = new Date();
  return Math.round((attemptStart - now) / 1000);
}

module.exports = {
  init,
  handle,
  get,
  getNextSeconds
};
