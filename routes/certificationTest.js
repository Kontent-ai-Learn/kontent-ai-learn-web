const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const handleCache = require('../helpers/handleCache');
const commonContent = require('../helpers/commonContent');
const helper = require('../helpers/helperFunctions');
const getUrlMap = require('../helpers/urlMap');
const isPreview = require('../helpers/isPreview');
const postprocessMarkup = require('../helpers/postprocessMarkup');
const smartLink = require('../helpers/smartLink');
const certificationAttempt = require('../helpers/certification/attempt');
const certificationEmail = require('../helpers/certification/email');

router.get('/:slug', asyncHandler(async (req, res, next) => {
  const home = await handleCache.ensureSingle(res, 'home', async () => {
    return commonContent.getHome(res);
  });

  if (!home.length) {
    return next();
  }

  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const urlMapItem = helper.getMapItemByUrl(req.originalUrl, urlMap);
  if (!urlMapItem) return next();

  const certificationTestItem = await handleCache.evaluateSingle(res, urlMapItem.codename, async () => {
    return await commonContent.getCertificationTest(res, urlMapItem.codename);
  });

  const footer = await handleCache.ensureSingle(res, 'footer', async () => {
    return commonContent.getFooter(res);
  });
  const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return commonContent.getUIMessages(res);
  });
  const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);
  const siteIsPreview = isPreview(res.locals.previewapikey);

  return res.render('pages/certificationTest', {
    req: req,
    res: res,
    title: certificationTestItem[0].title.value,
    postprocessMarkup: postprocessMarkup,
    slug: req.params.slug,
    itemCodename: urlMapItem.codename,
    isPreview: siteIsPreview,
    language: res.locals.language,
    navigation: home[0].subpages.value,
    footer: footer && footer.length ? footer[0] : null,
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
    helper: helper,
    smartLink: siteIsPreview ? smartLink : null
  });
}));

router.post('/:slug', asyncHandler(async (req, res, next) => {
  const attempt = await certificationAttempt.handle(req.body);
  await certificationEmail.sendCongrats(attempt);
  if (!attempt) return next();
  return res.redirect(302, `${req.originalUrl.split('?')[0]}${attempt.id}/`);
}));

router.get('/:slug/:attemptid', asyncHandler(async (req, res, next) => {
  const home = await handleCache.ensureSingle(res, 'home', async () => {
    return commonContent.getHome(res);
  });

  if (!home.length) {
    return next();
  }

  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });

  let url = req.originalUrl.split('?')[0].replace(/\/$/, '');
  url = `${url.slice(0, url.lastIndexOf('/'))}/`;
  const urlMapItem = helper.getMapItemByUrl(url, urlMap);
  if (!urlMapItem) return next();

  const certificationTestItem = await handleCache.evaluateSingle(res, urlMapItem.codename, async () => {
    return await commonContent.getCertificationTest(res, urlMapItem.codename);
  });

  const attempt = await certificationAttempt.get(req.params.attemptid);
  if (!attempt) return next();

  const footer = await handleCache.ensureSingle(res, 'footer', async () => {
    return commonContent.getFooter(res);
  });
  const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return commonContent.getUIMessages(res);
  });
  const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);
  const siteIsPreview = isPreview(res.locals.previewapikey);

  return res.render('pages/certificationTestResult', {
    req: req,
    res: res,
    title: certificationTestItem[0].title.value,
    nextAttemptSeconds: certificationAttempt.getNextSeconds(attempt.start),
    attempt: attempt,
    postprocessMarkup: postprocessMarkup,
    slug: req.params.slug,
    itemCodename: urlMapItem.codename,
    isPreview: siteIsPreview,
    language: res.locals.language,
    navigation: home[0].subpages.value,
    footer: footer && footer.length ? footer[0] : null,
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
    helper: helper,
    smartLink: siteIsPreview ? smartLink : null
  });
}));

module.exports = router;
