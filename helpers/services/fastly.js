const axios = require('axios');
const cacheHandle = require('../cache/handle');
const {
  getDomain,
  getRedirectUrls,
  getUniqueUrls,
  isAbsoluteUrl,
  logInCacheKey
} = require('../general/helper');
const getUrlMap = require('../general/urlMap');
const getContent = require('../kontent/getContent');
const isPreview = require('../kontent/isPreview');

const getChangelogQueryStringCombinations = async (res) => {
  const releaseNoteContentType = await cacheHandle.evaluateSingle(res, 'releaseNoteContentType', async () => {
      return await getContent.releaseNoteType(res);
  });

  const releaseNotesServices = releaseNoteContentType?.elements.filter(elem => elem.codename === 'affected_services')[0]?.options.map(item => item.codename) || [];
  const combinations = [];

  combinations.push('breaking=true');

  for (let i = 0; i < releaseNotesServices.length; i++) {
      const combinationServices = `show=${releaseNotesServices[i]}`;
      combinations.push(combinationServices);
      combinations.push(`${combinationServices}&breaking=true`);
  }

  return combinations;
};

const axiosPurge = async (domain, path) => {
    const url = `${domain}${path}`;
    const log = {
      url: url,
      timestamp: (new Date()).toISOString(),
      isError: false
    };

    try {
      const purgeResponse = await axios({
        method: 'purge',
        url: url,
        headers: {
            'Fastly-Soft-Purge': '1'
        }
      });
      log.data = purgeResponse.data;
    } catch (error) {
      log.isError = true;
      log.data = error;
    }

    logInCacheKey('fastly-purge', log);
};

const purge = async (key, res) => {
  if (isPreview(res.locals.previewapikey)) return;

  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });

  for (let i = 0; i < urlMap.length; i++) {
    if (urlMap[i].codename === key) {
      const validDomain = getDomain();
      if (!validDomain) return;
      await axiosPurge(validDomain, urlMap[i].url);
    }
  }
};

const purgeToRedirectUrls = async (urls, res) => {
  if (isPreview(res.locals.previewapikey)) return;

  const redirectUrls = getRedirectUrls(urls);
  if (!redirectUrls.length) return;

  const validDomain = getDomain();
  if (!validDomain) return;

  for (let i = 0; i < redirectUrls.length; i++) {
    await axiosPurge(validDomain, redirectUrls[i]);
  }
};

const purgeRedirectRule = async (codename, res) => {
  const redirectRules = await cacheHandle.evaluateSingle(res, 'redirectRules', async () => {
    return await getContent.redirectRules(res);
  });

  const validDomain = getDomain();
  if (!validDomain) return;

  for (let i = 0; i < redirectRules.length; i++) {
    if (redirectRules[i].system.codename === codename) {
      await axiosPurge(validDomain, redirectRules[i].redirect_from.value);
      if (!isAbsoluteUrl(redirectRules[i].redirect_to.value)) {
        await axiosPurge(validDomain, redirectRules[i].redirect_to.value);
      }
    }
  }
};

const purgeAllUrls = async (res) => {
  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const uniqueUrls = getUniqueUrls(urlMap);
  const validDomain = getDomain();
  if (!validDomain) return;

  for (let i = 0; i < uniqueUrls.length; i++) {
    await axiosPurge(validDomain, uniqueUrls[i]);
  }
};

const purgeAllTechUrls = async (res) => {
  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });

  const validDomain = getDomain();
  if (!validDomain) return;

  for (let i = 0; i < urlMap.length; i++) {
    if (urlMap[i].url.includes('?tech=')) {
      await axiosPurge(validDomain, urlMap[i].url);
    }
  }
};

const purgeInitial = async (itemsByTypes, items, res) => {
  if (isPreview(res.locals.previewapikey)) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].operation === 'unpublish') {
      await purge(items[i].codename, res);

      if (items[i].type === 'redirect_rule') {
        await purgeRedirectRule(items[i].codename, res);
      }
    }
  }

  if (itemsByTypes.home.length) {
    await purgeAllUrls(res);
  }
};

const purgeFinal = async (itemsByTypes, req, res) => {
  if (isPreview(res.locals.previewapikey)) return;
  let allUrlsPurged = false;
  const axiosDomain = getDomain();

  if (itemsByTypes.releaseNotes.length && req.app.locals.changelogPath) {
    await axiosPurge(axiosDomain, req.app.locals.changelogPath);

    const changelogQueryStringCombinations = await getChangelogQueryStringCombinations(res);
    for (let i = 0; i < changelogQueryStringCombinations.length; i++) {
      await axiosPurge(axiosDomain, `${req.app.locals.changelogPath}?${changelogQueryStringCombinations[i]}`);
    }
  }

  if (itemsByTypes.termDefinitions.length && !allUrlsPurged) {
    await purgeAllUrls(res);
    allUrlsPurged = true;
  }

  if (itemsByTypes.trainingCourses.length && req.app.locals.elearningPath) {
    await axiosPurge(axiosDomain, req.app.locals.elearningPath);
  }

  if (itemsByTypes.trainingSurveys.length) {
    for (let i = 0; i < itemsByTypes.trainingSurveys.length; i++) {
      await purge(itemsByTypes.trainingSurveys[i].codename, res);
    }
  }

  if (itemsByTypes.trainingCertificationTests.length) {
    for (let i = 0; i < itemsByTypes.trainingCertificationTests.length; i++) {
      await purge(itemsByTypes.trainingCertificationTests[i].codename, res);
    }
  }

  if (itemsByTypes.articles.length ||
      itemsByTypes.apiSpecifications.length ||
      itemsByTypes.trainingCertificationTests.length ||
      itemsByTypes.landingPages.length ||
      itemsByTypes.trainingCourses.length ||
      itemsByTypes.redirectRules.length) {
    await axiosPurge(axiosDomain, '/learn/redirect-urls');
  }

  if (itemsByTypes.redirectRules.length) {
    for (let i = 0; i < itemsByTypes.redirectRules.length; i++) {
      await purgeRedirectRule(itemsByTypes.redirectRules[i].codename, res);
    }
  }

  if ((itemsByTypes.home.length || itemsByTypes.UIMessages.length) && !allUrlsPurged) {
    await purgeAllUrls(res);
    allUrlsPurged = true;
  }

  if (itemsByTypes.picker.length && !allUrlsPurged) {
    await purgeAllTechUrls(res);
  }
};

const purgePDF = async (filename) => {
  const axiosDomain = getDomain();
  await axiosPurge(axiosDomain, `/files/${filename}.pdf`);
};

const preventCaching = (res) => {
  res.removeHeader('Surrogate-Control');
  res.setHeader('Cache-Control', 'no-store,max-age=0');
  return res;
};

const handleGlobalCaching = (req, res) => {
  res.setHeader('Arr-Disable-Session-Affinity', 'True');

  if (req.originalUrl.startsWith('/learn/cache-invalidate') || req.originalUrl.startsWith('/learn/service-check')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  } else {
    res.setHeader('Cache-Control', 'max-age=60');
  }

  if (!(isPreview(res.locals.previewapikey) || (req.originalUrl.indexOf('/learn/cache-invalidate') > -1))) {
    // https://docs.fastly.com/en/guides/serving-stale-content#manually-enabling-serve-stale
    // update the content after 24h; serve stale for 1d after max-age passes; show stale for 3d if origin down
    res.setHeader('Surrogate-Control', 'max-age=86400, stale-while-revalidate=86400, stale-if-error=259200');
  }

  return res;
};

const staticFileCaching = (res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://tracker.kontent.ai');
  res.setHeader('Cache-Control', 'public,max-age=31536000,stale-while-revalidate=86400');
  return res;
};

const immutableFileCaching = (res) => {
  res.removeHeader('Surrogate-Control');
  res.setHeader('Access-Control-Allow-Origin', 'https://tracker.kontent.ai');
  res.setHeader('Cache-Control', 'max-age=31536000,immutable,stale-while-revalidate=86400');
  return res;
};

module.exports = {
  purge,
  axiosPurge,
  purgeToRedirectUrls,
  purgeFinal,
  purgeInitial,
  purgeAllUrls,
  preventCaching,
  handleGlobalCaching,
  staticFileCaching,
  immutableFileCaching,
  purgePDF
};
