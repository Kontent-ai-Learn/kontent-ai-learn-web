const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Api2Pdf = require('api2pdf');
const a2pClient = new Api2Pdf(process.env['Api2Pdf.ApiKey']);
const moment = require('moment');
const download = require('download');
const fs = require('fs');

const cacheHandle = require('../helpers/cache/handle');
const getContent = require('../helpers/kontent/getContent');
const helper = require('../helpers/general/helper');
const getUrlMap = require('../helpers/general/urlMap');
const isPreview = require('../helpers/kontent/isPreview');
const postprocessMarkup = require('../helpers/resolve/postprocessMarkup');
const smartLink = require('../helpers/kontent/smartLink');
const certificationAttempt = require('../helpers/certification/attempt');
const certificationEmail = require('../helpers/certification/email');
const certificationData = require('../helpers/certification/data');

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

  const certificationTestItem = await cacheHandle.evaluateSingle(res, urlMapItem.codename, async () => {
    return await getContent.certificationTest(res, urlMapItem.codename);
  });

  const footer = await cacheHandle.ensureSingle(res, 'footer', async () => {
    return getContent.footer(res);
  });
  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return getContent.UIMessages(res);
  });
  const platformsConfigPairings = await getContent.platformsConfigPairings(res);
  const siteIsPreview = isPreview(res.locals.previewapikey);

  return res.render('pages/certificationTest', {
    req: req,
    res: res,
    title: certificationTestItem.items[0].title.value,
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
  if (!attempt) return next();
  await certificationEmail.sendCongrats(attempt, res);
  return res.redirect(302, `${req.originalUrl.split('?')[0]}${attempt.id}/`);
}));

router.get('/:slug/:attemptid', asyncHandler(async (req, res, next) => {
  const home = await cacheHandle.ensureSingle(res, 'home', async () => {
    return getContent.home(res);
  });

  if (!home.length) {
    return next();
  }

  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });

  let url = helper.getPathWithoutTrailingSlash(req.originalUrl);
  url = helper.removePathLastSegments(url, 1);
  const urlMapItem = helper.getMapItemByUrl(url, urlMap);
  if (!urlMapItem) return next();

  const certificationTestItem = await cacheHandle.evaluateSingle(res, urlMapItem.codename, async () => {
    return await getContent.certificationTest(res, urlMapItem.codename);
  });

  const attempt = await certificationAttempt.get(req.params.attemptid);
  if (!attempt) return next();

  const footer = await cacheHandle.ensureSingle(res, 'footer', async () => {
    return getContent.footer(res);
  });
  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return getContent.UIMessages(res);
  });
  const platformsConfigPairings = await getContent.platformsConfigPairings(res);
  const siteIsPreview = isPreview(res.locals.previewapikey);

  return res.render('pages/certificationTestResult', {
    req: req,
    res: res,
    title: certificationTestItem.items[0].title.value,
    nextAttemptSeconds: certificationAttempt.getNextSeconds(attempt.start),
    attempt: attempt,
    incorrect: certificationData.getIncorrect(attempt),
    content: certificationTestItem.items[0],
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

router.get('/exam/:attemptid/certificate', asyncHandler(async (req, res, next) => {
  const attempt = await certificationAttempt.get(req.params.attemptid);
  if (!attempt) return next();

  let baseURL;

  if (process.env.ngrok) {
      baseURL = process.env.ngrok;
  } else if (process.env.aliasURL) {
      baseURL = process.env.aliasURL;
  } else {
      baseURL = process.env.baseURL;
  }

  const url = `${req.originalUrl.split('?')[0]}pdf`;

  const fileName = `${attempt.test.codename}_${attempt.id}.pdf`;

  const options = {
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    printBackground: true
  };
  let pdfResult;
  let error;

a2pClient.headlessChromeFromUrl(`${baseURL}${url}`, true, fileName, options)
  .then((result) => {
      pdfResult = result;
  }, (rejected) => {
      error = rejected
  })
  .then(async () => {
      if (error) return next();
      await download(pdfResult.pdf, 'public/learn/files');
      setTimeout(() => {
        fs.unlink(`public/learn/files/${fileName}`, () => null)
      }, 60000);
      return res.redirect(303, `${baseURL}/learn/files/${fileName}`);
  })
}));

router.get('/exam/:attemptid/certificate/pdf', asyncHandler(async (req, res, next) => {
  const attempt = await certificationAttempt.get(req.params.attemptid);
  if (!attempt) return next();

  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return getContent.UIMessages(res);
  });

  return res.render('certificate/exam', {
    UIMessages: UIMessages?.[0],
    attempt: attempt,
    moment: moment
  });
}));

router.get('/course/:registrationId/certificate', asyncHandler(async (req, res, next) => {
  const scorm = require('../helpers/services/scorm');
  const registrationData = await scorm.getRegistrationIdData(req.params.registrationId);
  if (!registrationData) return next();

  let baseURL;

  if (process.env.ngrok) {
      baseURL = process.env.ngrok;
  } else if (process.env.aliasURL) {
      baseURL = process.env.aliasURL;
  } else {
      baseURL = process.env.baseURL;
  }

  const url = `${req.originalUrl.split('?')[0]}pdf`;

  const fileName = `${registrationData.course.id}_${req.params.registrationId}.pdf`;

  const options = {
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    printBackground: true
  };
  let pdfResult;
  let error;

a2pClient.headlessChromeFromUrl(`${baseURL}${url}`, true, fileName, options)
  .then((result) => {
      pdfResult = result;
  }, (rejected) => {
      error = rejected
  })
  .then(async () => {
      if (error) return next();
      await download(pdfResult.pdf, 'public/learn/files');
      setTimeout(() => {
        fs.unlink(`public/learn/files/${fileName}`, () => null)
      }, 60000);
      return res.redirect(303, `${baseURL}/learn/files/${fileName}`);
  })
}));

router.get('/course/:registrationId/certificate/pdf', asyncHandler(async (req, res, next) => {
  const scorm = require('../helpers/services/scorm');
  const registrationData = await scorm.getRegistrationIdData(req.params.registrationId);
  if (!registrationData) return next();

  return res.render('certificate/course', {
    registrationData: registrationData,
    moment: moment
  });
}));

module.exports = router;
