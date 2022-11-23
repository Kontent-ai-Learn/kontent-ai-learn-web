const getContent = require('../kontent/getContent');
const helper = require('../general/helper');
const cacheHandle = require('../cache/handle');
const getUrlMap = require('../general/urlMap');

const getRedirectUrls = async (res) => {
  const articles = await cacheHandle.evaluateSingle(res, 'articles', async () => {
    return await getContent.articles(res);
  });
  const landingPages = await cacheHandle.evaluateSingle(res, 'landingPages', async () => {
    return await getContent.landingPage(res);
  });
  const certificationTests = await cacheHandle.evaluateSingle(res, 'trainingCertificationTests', async () => {
    return await getContent.certificationTest(res);
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

  const items = [...articles, ...landingPages, ...certificationTests.items, ...references, ...trainingCourses];
  const redirectMap = [];

  items.forEach(item => {
    if (item.elements.redirect_urls && item.elements.redirect_urls.value) {
      const originalUrl = urlMap.filter(url => url.codename === item.system.codename);

      if (originalUrl.length) {
        redirectMap.push({
          id: item.system.id,
          originalUrl: helper.addTrailingSlashTo(originalUrl[0].url),
          redirectUrls: helper.getRedirectUrls(item.elements.redirect_urls).map(item => helper.addTrailingSlashTo(item))
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
    const to = redirectRules[i].elements.redirect_to.value;
    const redirectTo = [];

    if (!redirectRules[i].processed) {
      for (let j = 0; j < redirectRules.length; j++) {
        if (to === redirectRules[j].elements.redirect_to.value) {
          redirectTo.push({
            id: redirectRules[j].system.id,
            url: helper.addTrailingSlashTo(redirectRules[j].elements.redirect_from.value)
          });
          redirectRules[j].processed = true;
        }
      }

      redirectMap.push({
        originalUrl: helper.addTrailingSlashTo(to),
        redirectUrls: redirectTo
      });
    }
  }

  for (let i = 0; i < redirectRules.length; i++) {
    redirectRules[i].processed = false;
  }

  return redirectMap;
};

const redirects = async (res) => {
  const rules = await getRedirectRules(res);
  const urls = await getRedirectUrls(res);
  const projectId = res.locals.projectid;
  const language = res.locals.language || 'default';
  return { rules, urls, projectId, language };
};

module.exports = redirects;
