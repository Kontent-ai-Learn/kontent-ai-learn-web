const axios = require('axios');
const consola = require('consola');
const isPreview = require('./isPreview');
const handleCache = require('./handleCache');
const helper = require('./helperFunctions');
const getUrlMap = require('./urlMap');
const commonContent = require('./commonContent');

const axiosPurge = async (url) => {
  try {
    await axios({
      method: 'purge',
      url: url,
      headers: {
          'Fastly-Soft-Purge': '1'
      }
    });
  } catch (error) {
    consola.error('Fastly not available');
  }
};

const purge = async (key, res) => {
  if (isPreview(res.locals.previewapikey)) return;

  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });

  for (let i = 0; i < urlMap.length; i++) {
    if (urlMap[i].codename === key) {
      const validDomain = helper.getDomain();
      if (!validDomain) return;
      await axiosPurge(`${validDomain}${urlMap[i].url}`);
    }
  }
};

const purgeToRedirectUrls = async (urls, res) => {
  if (isPreview(res.locals.previewapikey)) return;

  const redirectUrls = helper.getRedirectUrls(urls);
  if (!redirectUrls.length) return;

  const validDomain = helper.getDomain();
  if (!validDomain) return;

  for (let i = 0; i < redirectUrls.length; i++) {
    await axiosPurge(`${validDomain}${redirectUrls[i]}`);
  }
};

const purgeRedirectRule = async (codename, res) => {
  const redirectRules = await handleCache.evaluateSingle(res, 'redirectRules', async () => {
    return await commonContent.getRedirectRules(res);
  });

  const validDomain = helper.getDomain();
  if (!validDomain) return;

  for (let i = 0; i < redirectRules.length; i++) {
    if (redirectRules[i].system.codename === codename) {
      await axiosPurge(`${validDomain}${redirectRules[i].redirect_from.value}`);
      if (!helper.isAbsoluteUrl(redirectRules[i].redirect_to.value)) {
        await axiosPurge(`${validDomain}${redirectRules[i].redirect_to.value}`);
      }
    }
  }
};

const purgeAllUrls = async (res) => {
  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const uniqueUrls = helper.getUniqueUrls(urlMap);
  const validDomain = helper.getDomain();
  if (!validDomain) return;

  for (let i = 0; i < uniqueUrls.length; i++) {
    await axiosPurge(`${validDomain}${uniqueUrls[i]}`);
  }
  await axiosPurge(`${validDomain}/redirect-urls`);
};

const purgeAllTechUrls = async (res) => {
  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });

  const validDomain = helper.getDomain();
  if (!validDomain) return;

  for (let i = 0; i < urlMap.length; i++) {
    if (urlMap[i].url.includes('?tech=')) {
      await axiosPurge(`${validDomain}${urlMap[i].url}`);
    }
  }
};

const purgeInitial = async (items, res) => {
  if (isPreview(res.locals.previewapikey)) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].operation === 'unpublish') {
      await purge(items[i].codename, res);

      if (items[i].type === 'redirect_rule') {
        await purgeRedirectRule(items[i].codename, res);
      }
    }
  }
};

const purgeFinal = async (itemsByTypes, req, res) => {
  if (isPreview(res.locals.previewapikey)) return;
  let allUrlsPurged = false;
  const axiosDomain = helper.getDomain();

  if (itemsByTypes.releaseNotes.length && req.app.locals.changelogPath) {
    await axiosPurge(`${axiosDomain}${req.app.locals.changelogPath}`);
  }

  if (itemsByTypes.termDefinitions.length && !allUrlsPurged) {
    await purgeAllUrls(res);
    allUrlsPurged = true;
  }

  if (itemsByTypes.trainingCourses.length && req.app.locals.elearningPath) {
    await axiosPurge(`${axiosDomain}${req.app.locals.elearningPath}`);
  }

  if (itemsByTypes.articles.length || itemsByTypes.scenarios.length || itemsByTypes.apiSpecifications.length || itemsByTypes.redirectRules.length) {
    await axiosPurge(`${axiosDomain}/redirect-urls`);
  }

  if (itemsByTypes.redirectRules.length) {
    for (let i = 0; i < itemsByTypes.redirectRules.length; i++) {
      await purgeRedirectRule(itemsByTypes.redirectRules[i].codename, res);
    }
  }

  if (itemsByTypes.home.length && !allUrlsPurged) {
    await purgeAllUrls(res);
    allUrlsPurged = true;
  }

  if (itemsByTypes.picker.length && !allUrlsPurged) {
    await purgeAllTechUrls(res);
  }
};

const preventCaching = (res) => {
  res.removeHeader('Surrogate-Control');
  res.setHeader('Cache-Control', 'private,no-store,no-cache,max-age=0');
  return res;
};

const handleGlobalCaching = (req, res) => {
  res.setHeader('Arr-Disable-Session-Affinity', 'True');

  if (req.originalUrl.startsWith('/cache-invalidate') || req.originalUrl.startsWith('/redirect-urls')) {
    res.setHeader('Cache-Control', 'private,no-store,no-cache');
  } else {
    res.setHeader('Cache-Control', 'max-age=0,must-revalidate,public');
  }

  if (!(isPreview(res.locals.previewapikey) || (req.originalUrl.indexOf('/cache-invalidate') > -1))) {
    // https://docs.fastly.com/en/guides/serving-stale-content#manually-enabling-serve-stale
    // update the content after 24 hours (86400 seconds) but if the origin is down then show stale content for three days (259200 seconds)
    res.setHeader('Surrogate-Control', 'max-age=86400, stale-if-error=259200');
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
  immutableFileCaching
};
