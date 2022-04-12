const express = require('express');
const router = express.Router();

const postprocessMarkup = require('../helpers/resolve/postprocessMarkup');
const isPreview = require('../helpers/kontent/isPreview');
const getContent = require('../helpers/kontent/getContent');
const helper = require('../helpers/general/helper');
const cacheHandle = require('../helpers/cache/handle');
const getUrlMap = require('../helpers/general/urlMap');

const getRedirectUrls = async (res) => {
  const articles = await cacheHandle.evaluateSingle(res, 'articles', async () => {
    return await getContent.articles(res);
  });
  const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.trainingCourse(res);
  });
  const references = await cacheHandle.evaluateSingle(res, 'apiSpecifications', async () => {
    return getContent.references(res);
  });
  const urlMap = await cacheHandle.evaluateSingle(res, 'urlMap', async () => {
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
  const redirectRules = await cacheHandle.evaluateSingle(res, 'redirectRules', async () => {
    return await getContent.redirectRules(res);
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
  const footer = await cacheHandle.ensureSingle(res, 'footer', async () => {
    return getContent.footer(res);
  });
  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return getContent.UIMessages(res);
  });
  const home = await cacheHandle.ensureSingle(res, 'home', async () => {
    return getContent.home(res);
  });
  const redirectRules = await getRedirectRules(res);
  const redirectMap = await getRedirectUrls(res);
  const platformsConfigPairings = await getContent.platformsConfigPairings(res);

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
