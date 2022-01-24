const express = require('express');
const router = express.Router();

const postprocessMarkup = require('../helpers/postprocessMarkup');
const isPreview = require('../helpers/isPreview');
const commonContent = require('../helpers/commonContent');
const helper = require('../helpers/helperFunctions');
const handleCache = require('../helpers/handleCache');
const getUrlMap = require('../helpers/urlMap');

const getRedirectUrls = async (res) => {
  const articles = await handleCache.evaluateSingle(res, 'articles', async () => {
    return await commonContent.getArticles(res);
  });
  const trainingCourses = await handleCache.evaluateSingle(res, 'trainingCourses', async () => {
    return await commonContent.getTraniningCourse(res);
  });
  const references = await handleCache.evaluateSingle(res, 'apiSpecifications', async () => {
    return commonContent.getReferences(res);
  });
  const urlMap = await handleCache.evaluateSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });

  const items = [...articles, ...references, ...trainingCourses];
  const redirectMap = [];

  items.forEach(item => {
    if (item.redirect_urls && item.redirect_urls.value) {
      const originalUrl = urlMap.filter(url => url.codename === item.system.codename);

      if (originalUrl.length) {
        redirectMap.push({
          id: item.system.id,
          originalUrl: originalUrl[0].url,
          redirectUrls: helper.getRedirectUrls(item.redirect_urls)
        });
      }
    }
  });

  redirectMap.sort((a, b) => (a.originalUrl > b.originalUrl) ? 1 : ((b.originalUrl > a.originalUrl) ? -1 : 0))

  return redirectMap;
};

const getRedirectRules = async (res) => {
  const redirectRules = await handleCache.evaluateSingle(res, 'redirectRules', async () => {
    return await commonContent.getRedirectRules(res);
  });

  const redirectMap = [];

  for (let i = 0; i < redirectRules.length; i++) {
    const to = redirectRules[i].redirect_to.value;
    const redirectTo = [];

    if (!redirectRules[i].processed) {
      for (let j = 0; j < redirectRules.length; j++) {
        if (to === redirectRules[j].redirect_to.value) {
          redirectTo.push({
            id: redirectRules[j].system.id,
            url: redirectRules[j].redirect_from.value
          });
          redirectRules[j].processed = true;
        }
      }

      redirectMap.push({
        originalUrl: to,
        redirectUrls: redirectTo
      });
    }
  }

  for (let i = 0; i < redirectRules.length; i++) {
    redirectRules[i].processed = false;
  }

  return redirectMap;
};

router.get('/', async (req, res) => {
  const footer = await handleCache.ensureSingle(res, 'footer', async () => {
    return commonContent.getFooter(res);
  });
  const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return commonContent.getUIMessages(res);
  });
  const home = await handleCache.ensureSingle(res, 'home', async () => {
    return commonContent.getHome(res);
  });
  const redirectRules = await getRedirectRules(res);
  const redirectMap = await getRedirectUrls(res);
  const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);

  return res.render('pages/redirectUrls', {
    req: req,
    postprocessMarkup: postprocessMarkup,
    isPreview: isPreview(res.locals.previewapikey),
    projectId: res.locals.projectid,
    language: res.locals.language,
    title: 'Redirect URLs',
    navigation: home[0].subpages.value,
    redirectRules: redirectRules,
    redirectMap: redirectMap,
    footer: footer[0] ? footer[0] : null,
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
    helper: helper
  });
});

module.exports = router;
