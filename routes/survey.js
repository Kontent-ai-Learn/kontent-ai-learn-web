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
  if (!content.length) return next();

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
    itemId: content[0].system.id,
    title: content[0].title.value,
    introduction: content[0].short_introduction.value,
    description: helper.stripTags(content[0].short_introduction.value).substring(0, 300),
    questions: content[0].survey_questions.value,
    navigation: home[0].subpages.value,
    footer: footer && footer.length ? footer[0] : null,
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
    helper: helper,
    smartLink: siteIsPreview ? smartLink : null
  });
}));

router.post('/:slug', asyncHandler(async (req, res, next) => {
  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const urlMapItem = helper.getMapItemByUrl(req.originalUrl, urlMap);
  if (!urlMapItem) return next();
  const content = await handleCache.evaluateSingle(res, urlMapItem.codename, async () => {
    return await commonContent.getSurvey(res, urlMapItem.codename);
  });
  if (!content.length) return next();

  const data = {
    survey_id: content[0].system.id,
    email: req.body.email,
    course_id: req.body.courseid,
    survey_type: content[0].system.name,
    timestamp: new Date().toISOString(),
    items: []
  };

  for (const prop in req.body) {
    if (Object.prototype.hasOwnProperty.call(req.body, prop)) {
      if (prop !== 'email' && prop !== 'courseid') {
        const question = prop.split('|');
        const answer = req.body[prop].split('|');
        data.items.push({
          question_id: question[1] || null,
          question: question[0] || null,
          answer_id: answer[1] || null,
          answer: answer[0] || null,
          type: question[2] || null
        });
      }
    }
  }

  console.log(data)

  const trainingCourses = await handleCache.evaluateSingle(res, 'trainingCourses', async () => {
    return await commonContent.getTraniningCourse(res);
  });
  const trainingCourse = trainingCourses.find(item => item.scorm_cloud_id.value === req.body.courseid);
  if (!trainingCourse) return next();
  const urlMapCourseItem = urlMap.find(item => item.codename === trainingCourse.system.codename);
  if (!urlMapCourseItem) return next();

  return res.redirect(urlMapCourseItem.url);
}));

module.exports = router;
