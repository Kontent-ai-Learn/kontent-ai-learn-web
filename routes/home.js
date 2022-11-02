const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const postprocessMarkup = require('../helpers/resolve/postprocessMarkup');
const isPreview = require('../helpers/kontent/isPreview');
const getContent = require('../helpers/kontent/getContent');
const smartLink = require('../helpers/kontent/smartLink');
const helper = require('../helpers/general/helper');
const cacheHandle = require('../helpers/cache/handle');

router.get('/', asyncHandler(async (req, res, next) => {
  const home = await cacheHandle.ensureSingle(res, 'home', async () => {
    return await getContent.home(res);
  });

  if (!home.length) {
    return next();
  }

  const footer = await cacheHandle.ensureSingle(res, 'footer', async () => {
    return await getContent.footer(res);
  });
  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return await getContent.UIMessages(res);
  });
  const platformsConfigPairings = await getContent.platformsConfigPairings(res);
  const siteIsPreview = isPreview(res.locals.previewapikey);

  return res.render('pages/home', {
    req: req,
    res: res,
    postprocessMarkup: postprocessMarkup,
    slug: 'home',
    isPreview: siteIsPreview,
    language: res.locals.language,
    itemId: home[0].system.id,
    title: home[0].elements.title.value,
    description: helper.stripTags(home[0].elements.description.value).substring(0, 300),
    navigation: home[0].elements.subpages.linkedItems,
    introNote: home[0].elements.intro_note.value,
    signposts: home[0].elements.signposts.value,
    support: home[0].elements.support.value,
    footer: footer && footer.length ? footer[0] : null,
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
    helper: helper,
    smartLink: siteIsPreview ? smartLink : null
  });
}));

module.exports = router;
