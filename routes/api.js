const express = require('express');

const basicAuth = require('express-basic-auth');
const router = express.Router();
const certificationAttempt = require('../helpers/certification/attempt');
const certificationDetail = require('../helpers/certification/detail');
const certificationEmail = require('../helpers/certification/email');
const elearningLandingPageApi = require('../helpers/e-learning/landingPageApi');
const elearningReporting = require('../helpers/e-learning/reporting');
const elearningProgress = require('../helpers/e-learning/progress');
const fastly = require('../helpers/services/fastly');
const jwtCheck = require('../helpers/services/jwt');
const userProfile = require('../helpers/user/profile');
const licensesUpdate = require('../helpers/licenses/update');

router.post('/training-certification/detail/private', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  let data = null;
  if (req.body.attemptid) {
    data = await certificationDetail.getByAttemptId(req.body.codename, req.body.attemptid, res);
  } else {
    data = await certificationDetail.get(req.body.codename, req, res);
  }
  return res.send(data);
});

router.post('/training-certification/detail/public', async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await certificationDetail.get(req.body.codename, req, res);
  return res.send(data);
});

router.post('/landing-page', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await elearningLandingPageApi.init(req, res);
  return res.send(data);
});

router.post('/landing-page/registration', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await elearningLandingPageApi.registration(req, res);
  return res.send(data);
});

router.post('/get-certified', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await certificationAttempt.init(req.body, res);
  return res.send(data);
});

router.post('/survey', jwtCheck, async (req, res) => {
  const surveyAttempt = require('../helpers/survey/attempt');
  res = fastly.preventCaching(res);
  const data = await surveyAttempt.init(req, res);
  return res.send(data);
});

router.post('/survey/submit', async (req, res) => {
  const surveyAttempt = require('../helpers/survey/attempt');
  res = fastly.preventCaching(res);
  const attempt = await surveyAttempt.handle(req.body);
  const data = await surveyAttempt.after(attempt, res);
  return res.send(data);
});

router.post('/e-learning/expiration-notifications', async (req, res) => {
  res = fastly.preventCaching(res);
  await certificationEmail.handleExpirations(res);
  return res.end();
});

router.get('/e-learning/progress', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await elearningProgress.getUserProgress(req, res);
  return res.send(data);
});

router.get('/user/profile', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await userProfile.get(req?.user.email, res);
  return res.send(data);
});

router.post('/user/profile', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await userProfile.createUpdate(req?.user.email, req.body, res);
  return res.send(data);
});

router.post('/scorm/postback', basicAuth((() => {
  const credentials = {};
  credentials[process.env.SCORM_USERNAME] = process.env.SCORM_USERPWD;
  return {
    users: credentials
  };
})()), async (req, res) => {
  res = fastly.preventCaching(res);
  let success = false;
  success = await elearningReporting.addRecord(req.body);
  success = await elearningProgress.setRecord(req.body);
  return res.status(success ? 200 : 400).end();
});

router.post('/licenses-updated', async (req, res) => {
  res = fastly.preventCaching(res);
  const response = await licensesUpdate.createUpdate(res);
  if (response && response.error) return res.status(400).send(response);
  return res.end();
});

module.exports = router;
