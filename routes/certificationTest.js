const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const Api2Pdf = require('api2pdf');
const a2pClient = new Api2Pdf(process.env['Api2Pdf.ApiKey']);
const fetch = require('node-fetch');
const moment = require('moment');

const handleCache = require('../helpers/handleCache');
const commonContent = require('../helpers/commonContent');
const helper = require('../helpers/helperFunctions');
const getUrlMap = require('../helpers/urlMap');
const isPreview = require('../helpers/isPreview');
const postprocessMarkup = require('../helpers/postprocessMarkup');
const smartLink = require('../helpers/smartLink');
const certificationAttempt = require('../helpers/certification/attempt');
const certificationEmail = require('../helpers/certification/email');

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

  const certificationTestItem = await handleCache.evaluateSingle(res, urlMapItem.codename, async () => {
    return await commonContent.getCertificationTest(res, urlMapItem.codename);
  });

  const footer = await handleCache.ensureSingle(res, 'footer', async () => {
    return commonContent.getFooter(res);
  });
  const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return commonContent.getUIMessages(res);
  });
  const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);
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
  await certificationEmail.sendCongrats(attempt);
  if (!attempt) return next();
  return res.redirect(302, `${req.originalUrl.split('?')[0]}${attempt.id}/`);
}));

router.get('/:slug/:attemptid', asyncHandler(async (req, res, next) => {
  const home = await handleCache.ensureSingle(res, 'home', async () => {
    return commonContent.getHome(res);
  });

  if (!home.length) {
    return next();
  }

  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });

  let url = helper.getPathWithoutTrailingSlash(req.originalUrl);
  url = helper.removePathLastSegments(url, 1);
  const urlMapItem = helper.getMapItemByUrl(url, urlMap);
  if (!urlMapItem) return next();

  const certificationTestItem = await handleCache.evaluateSingle(res, urlMapItem.codename, async () => {
    return await commonContent.getCertificationTest(res, urlMapItem.codename);
  });

  const attempt = await certificationAttempt.get(req.params.attemptid);
  if (!attempt) return next();

  const footer = await handleCache.ensureSingle(res, 'footer', async () => {
    return commonContent.getFooter(res);
  });
  const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return commonContent.getUIMessages(res);
  });
  const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);
  const siteIsPreview = isPreview(res.locals.previewapikey);

  return res.render('pages/certificationTestResult', {
    req: req,
    res: res,
    title: certificationTestItem.items[0].title.value,
    nextAttemptSeconds: certificationAttempt.getNextSeconds(attempt.start),
    attempt: attempt,
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

router.get('/:slug/:attemptid/certificate', asyncHandler(async (req, res, next) => {
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
    filename: fileName,
    inline: true,
    options: {
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      marginTop: 0,
      printBackground: true
    }
  };
  let pdfResult;
  let error;

a2pClient.chromeUrlToPdf(`${baseURL}${url}`, options)
        .then((result) => {
            pdfResult = result;
        }, (rejected) => {
            error = rejected
        })
        .then(async () => {
            if (error) return next();
            fetch(pdfResult.FileUrl).then(result => {
              result.headers.forEach((v, n) => res.setHeader(n, v));
              res.set('Content-disposition', `attachment; filename=${encodeURI(fileName)}`);
              return result.body.pipe(res);
            });
        })
}));

router.get('/:slug/:attemptid/certificate/pdf', asyncHandler(async (req, res, next) => {
  const attempt = await certificationAttempt.get(req.params.attemptid);
  if (!attempt) return next();

  return res.render('certificate/test', {
    attempt: attempt,
    moment: moment
  });
}));

module.exports = router;
