const axios = require('axios');
const consola = require('consola');
const isPreview = require('./isPreview');
const handleCache = require('./handleCache');
const helper = require('./helperFunctions');
const getUrlMap = require('./urlMap');
const commonContent = require('./commonContent');

const getValidDomain = () => {
  const domain = helper.getDomainSplitProtocolHost();
  if (!domain[1]) return null;
  return helper.getDomain(domain[0], domain[1]);
};

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
      const validDomain = getValidDomain();
      if (!validDomain) return;
      await axiosPurge(`${validDomain}${urlMap[i].url}`);
    }
  }
};

const purgeToRedirectUrls = async (urls, res) => {
  if (isPreview(res.locals.previewapikey)) return;

  const redirectUrls = helper.getRedirectUrls(urls);
  if (!redirectUrls.length) return;

  const validDomain = getValidDomain();
  if (!validDomain) return;

  for (let i = 0; i < redirectUrls.length; i++) {
    await axiosPurge(`${validDomain}${redirectUrls[i]}`);
  }
};

const purgeRedirectRule = async (codename, res) => {
  const redirectRules = await handleCache.evaluateSingle(res, 'redirectRules', async () => {
    return await commonContent.getRedirectRules(res);
  });

  const validDomain = getValidDomain();
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
  const validDomain = getValidDomain();
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

  const validDomain = getValidDomain();
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

  const domain = helper.getDomainSplitProtocolHost();
  if (domain[1]) {
    const axiosDomain = helper.getDomain(domain[0], domain[1]);

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
  }
};

module.exports = {
  purge,
  axiosPurge,
  purgeToRedirectUrls,
  purgeFinal,
  purgeInitial,
  purgeAllUrls
};
