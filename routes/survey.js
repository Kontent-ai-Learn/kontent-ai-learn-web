const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const cacheHandle = require('../helpers/cache/handle');
const getContent = require('../helpers/kontent/getContent');
const helper = require('../helpers/general/helper');
const getUrlMap = require('../helpers/general/urlMap');
const isPreview = require('../helpers/kontent/isPreview');
const postprocessMarkup = require('../helpers/resolve/postprocessMarkup');
const smartLink = require('../helpers/kontent/smartLink');
const surveyAttempt = require('../helpers/survey/attempt')

router.get('/:slug', asyncHandler(async (req, res, next) => {
  const home = await cacheHandle.ensureSingle(res, 'home', async () => {
    return getContent.home(res);
  });

  if (!home.length) {
    return next();
  }

  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const urlMapItem = helper.getMapItemByUrl(req.originalUrl, urlMap);
  if (!urlMapItem) return next();
  const content = await cacheHandle.evaluateSingle(res, urlMapItem.codename, async () => {
    return await getContent.survey(res, urlMapItem.codename);
  });
  if (!content.items.length) return next();

  const footer = await cacheHandle.ensureSingle(res, 'footer', async () => {
    return getContent.footer(res);
  });
  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return getContent.UIMessages(res);
  });
  const platformsConfigPairings = await getContent.platformsConfigPairings(res);
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

  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.traniningCourse(res);
  });
  const trainingCourse = trainingCourses.find(item => item?.system.id === courseIdTrainingCourse);
  if (!trainingCourse) return next();
  const urlMapCourseItem = urlMap.find(item => item.codename === trainingCourse.system.codename);
  if (!urlMapCourseItem) return next();

  return res.redirect(`${urlMapCourseItem.url}#trainingAction`);
}));

module.exports = router;
