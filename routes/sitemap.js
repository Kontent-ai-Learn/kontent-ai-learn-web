const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const moment = require('moment');

const getUrlMap = require('../helpers/urlMap');

router.get('/', asyncHandler(async (req, res, next) => {
  const urlMap = await getUrlMap({
    projectid: res.locals.projectid,
    previewapikey: res.locals.previewapikey,
    isSitemap: true
  });

  if (!urlMap[0]) {
    return next();
  }

  return res.render('pages/sitemap', {
    req: req,
    moment: moment,
    urlMap: urlMap
  });
}));

module.exports = router;
