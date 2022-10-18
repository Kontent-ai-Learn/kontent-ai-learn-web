const express = require('express');

const basicAuth = require('express-basic-auth');
const router = express.Router();
const cacheHandle = require('../helpers/cache/handle');
const certificationAttempt = require('../helpers/certification/attempt');
const certificationDetail = require('../helpers/certification/detail');
const certificationEmail = require('../helpers/certification/email');
const elearningLandingPageApi = require('../helpers/e-learning/landingPageApi');
const elearningReporting = require('../helpers/e-learning/reporting');
const elearningProgress = require('../helpers/e-learning/progress');
const fastly = require('../helpers/services/fastly');
const getContent = require('../helpers/kontent/getContent');
const jwtCheck = require('../helpers/services/jwt');
const getUrlMap = require('../helpers/general/urlMap');
const userProfile = require('../helpers/user/profile');

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

router.get('/redocly/data', async (req, res, next) => {
  const home = await cacheHandle.ensureSingle(res, 'home', async () => {
    return getContent.home(res);
  });

  if (!home.length) {
    return next();
  }

  const footer = await cacheHandle.ensureSingle(res, 'footer', async () => {
    return getContent.footer(res);
  });
  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return getContent.UIMessages(res);
  });
  const platformsConfigPairings = await getContent.platformsConfigPairings(res);

  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  return res.send({
    navigation: home[0].subpages.value,
    footer: footer && footer.length ? footer[0] : null,
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
    urlMap: urlMap && urlMap.length ? urlMap : null
  });
});

module.exports = router;
