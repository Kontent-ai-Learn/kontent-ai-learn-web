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

const commonContent = require('../helpers/commonContent');
const handleCache = require('../helpers/handleCache');
const appHelper = require('../helpers/app');

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
  await handleCache.evaluateCommon(res, ['platformsConfig', 'urlMap', 'footer', 'UIMessages', 'home', 'navigationItems', 'articles', 'termDefinitions']);

  const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return await commonContent.getUIMessages(res);
  });
  if (UIMessages && UIMessages.length) {
    res.locals.UIMessages = UIMessages[0];
  }

  await handleCache.cacheAllAPIReferences(res);
  const exists = await appHelper.pageExists(req, res, next);

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
router.use('/', home, articles);

// Check aliases on whitelisted url paths that do not match any routing above
router.use('/', asyncHandler(async (req, res, next) => {
  return await urlAliases(req, res, next);
}));

module.exports = router;
