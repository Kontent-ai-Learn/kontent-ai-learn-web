const express = require('express');
const router = express.Router();
const cache = require('memory-cache');

const minify = require('../helpers/minify');
const isPreview = require('../helpers/isPreview');
const commonContent = require('../helpers/commonContent');
const helper = require('../helpers/helperFunctions');

const getRedirectUrls = (res) => {
  const KCDetails = commonContent.getKCDetails(res);

  const articles = cache.get(`articles_${KCDetails.projectid}`);
  const urlMap = cache.get(`urlMap_${KCDetails.projectid}`);
  let redirectMap = [];

  articles.forEach(article => {
    if (article.redirect_urls.value) {
      let originalUrl = urlMap.filter(url => url.codename === article.system.codename);

      if (originalUrl.length) {
        redirectMap.push({
          originalUrl: originalUrl[0].url,
          redirectUrls: article.redirect_urls.value.split(';')
        });
      }
    }
  });

  return redirectMap;
};

router.get('/', async (req, res) => {
  const KCDetails = commonContent.getKCDetails(res);
  const footer = cache.get(`footer_${KCDetails.projectid}`);
  const UIMessages = cache.get(`UIMessages_${KCDetails.projectid}`);
  const home = cache.get(`home_${KCDetails.projectid}`);
  const redirectMap = getRedirectUrls(res);

  return res.render('tutorials/pages/redirectUrls', {
    req: req,
    minify: minify,
    isPreview: isPreview(res.locals.previewapikey),
    title: 'Redirect URLs',
    navigation: home[0] ? home[0].navigation : [],
    redirectMap: redirectMap,
    footer: footer[0] ? footer[0] : null,
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    helper: helper
  });
});

module.exports = router;
