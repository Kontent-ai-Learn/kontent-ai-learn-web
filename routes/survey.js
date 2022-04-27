const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const cacheHandle = require('../helpers/cache/handle');
const getContent = require('../helpers/kontent/getContent');
const helper = require('../helpers/general/helper');
const isPreview = require('../helpers/kontent/isPreview');
const postprocessMarkup = require('../helpers/resolve/postprocessMarkup');
const smartLink = require('../helpers/kontent/smartLink');

router.get('/', asyncHandler(async (req, res, next) => {
  const home = await cacheHandle.ensureSingle(res, 'home', async () => {
    return getContent.home(res);
  });

  if (!home.length) {
    return next();
  }
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
    title: 'Survey',
    slug: req.params.slug,
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

module.exports = router;
