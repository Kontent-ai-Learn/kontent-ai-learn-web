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
const surveyAttempt = require('../helpers/survey/attempt')

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
  const content = await handleCache.evaluateSingle(res, urlMapItem.codename, async () => {
    return await commonContent.getSurvey(res, urlMapItem.codename);
  });
  if (!content.items.length) return next();

  const footer = await handleCache.ensureSingle(res, 'footer', async () => {
    return commonContent.getFooter(res);
  });
  const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return commonContent.getUIMessages(res);
  });
  const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);
  const siteIsPreview = isPreview(res.locals.previewapikey);

  return res.render('pages/survey', {
    req: req,
    res: res,
    postprocessMarkup: postprocessMarkup,
    slug: req.params.slug,
    isPreview: siteIsPreview,
    language: res.locals.language,
    itemId: content.items[0].system.id,
    itemCodename: urlMapItem.codename,
    title: content.items[0].title.value,
    introduction: content.items[0].short_introduction.value,
    description: helper.stripTags(content.items[0].short_introduction.value).substring(0, 300),
    navigation: home[0].subpages.value,
    footer: footer && footer.length ? footer[0] : null,
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
    helper: helper,
    smartLink: siteIsPreview ? smartLink : null
  });
}));

router.post('/:slug', asyncHandler(async (req, res, next) => {
  const attempt = await surveyAttempt.handle(req.body);

  let courseIdTrainingCourse = attempt.course_id.replace('_preview', '');
  courseIdTrainingCourse = courseIdTrainingCourse.replace('dev_', '');

  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const trainingCourses = await handleCache.evaluateSingle(res, 'trainingCourses', async () => {
    return await commonContent.getTraniningCourse(res);
  });
  const trainingCourse = trainingCourses.find(item => item?.system.id === courseIdTrainingCourse);
  if (!trainingCourse) return next();
  const urlMapCourseItem = urlMap.find(item => item.codename === trainingCourse.system.codename);
  if (!urlMapCourseItem) return next();

  return res.redirect(`${urlMapCourseItem.url}#trainingAction`);
}));

module.exports = router;
