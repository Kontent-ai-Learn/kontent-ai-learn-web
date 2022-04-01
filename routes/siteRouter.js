const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const home = require('./home');
const rss = require('./rss');

const urlAliases = require('./urlAliases');
const redirectUrls = require('./redirectUrls');
const referenceUpdated = require('./referenceUpdated');
const linkUrls = require('./linkUrls');
const cacheInvalidate = require('./cacheInvalidate');
const form = require('./form');
const redirectRules = require('./redirectRules');
const generatePDF = require('./generatePDF');
const urlMap = require('./urlMap');
const articles = require('./articles');
const auth0Callback = require('./auth0Callback');
const api = require('./api');
const survey = require('./survey');
const certificationTest = require('./certificationTest');

const getContent = require('../helpers/kontent/getContent');
const cacheHandle = require('../helpers/cache/handle');
const { pageExists } = require('../helpers/general/app');

// Routes
router.use('/api', express.json({
  type: '*/*'
}), api);
router.use('/callback', auth0Callback);
router.use('/link-to', linkUrls);
router.use('/reference-updated', express.json({
  type: '*/*'
}), referenceUpdated);
router.use('/cache-invalidate', express.text({
  type: '*/*'
}), cacheInvalidate);
router.use('/', redirectRules);
router.use('/form', express.text({
  type: '*/*'
}), form);
router.use('/', asyncHandler(async (req, res, next) => {
  await cacheHandle.evaluateCommon(res, ['platformsConfig', 'urlMap', 'footer', 'UIMessages', 'home', 'navigationItems', 'articles', 'termDefinitions']);

  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return await getContent.UIMessages(res);
  });
  if (UIMessages && UIMessages.length) {
    res.locals.UIMessages = UIMessages[0];
  }

  await cacheHandle.apiReferences(res);
  const exists = await pageExists(req, res, next);

  if (!exists) {
    return await urlAliases(req, res, next);
  }
  return next();
}));

router.use('/redirect-urls', redirectUrls);
router.use('/rss', rss);
router.use('/pdf', generatePDF);
router.get('/urlmap', urlMap);
router.use('/survey', survey);
router.use('/get-certified', certificationTest);
router.use('/', home, articles);

// Check aliases on whitelisted url paths that do not match any routing above
router.use('/', asyncHandler(async (req, res, next) => {
  return await urlAliases(req, res, next);
}));

module.exports = router;
