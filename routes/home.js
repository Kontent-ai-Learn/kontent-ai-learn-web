const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const minify = require('../helpers/minify');
const isPreview = require('../helpers/isPreview');
const commonContent = require('../helpers/commonContent');
const helper = require('../helpers/helperFunctions');
const handleCache = require('../helpers/handleCache');
const smartLink = require('../helpers/smartLink');

router.get('/', asyncHandler(async (req, res, next) => {
  const home = await handleCache.ensureSingle(res, 'home', async () => {
    return commonContent.getHome(res);
  });

  if (!home[0]) {
    return next();
  }

  const footer = await handleCache.ensureSingle(res, 'footer', async () => {
    return commonContent.getFooter(res);
  });
  const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return commonContent.getUIMessages(res);
  });
  const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);
  const siteIsPreview = isPreview(res.locals.previewapikey);

  return res.render('tutorials/pages/home', {
    req: req,
    minify: minify,
    slug: 'home',
    isPreview: siteIsPreview,
    language: res.locals.language,
    itemId: home[0].system.id,
    title: home[0].title.value,
    description: helper.stripTags(home[0].description.value).substring(0, 300),
    navigation: home[0].navigation.value,
    introNote: home[0].intro_note.value,
    signposts: home[0].signposts.value,
    support: home[0].support.value,
    footer: footer && footer.length ? footer[0] : null,
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
    helper: helper,
    smartLink: siteIsPreview ? smartLink : null
  });
}));

module.exports = router;
