const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const moment = require('moment');

const helper = require('../helpers/helperFunctions');

let getUrlMap;
if (process.env.KK_NEW_STRUCTURE) {
  getUrlMap = require('../helpers/urlMap');
} else {
  getUrlMap = require('../helpers/urlMap_Obsolete');
}

router.get('/', asyncHandler(async (req, res, next) => {
  const urlMap = await getUrlMap(res, true);

  if (!urlMap[0]) {
    return next();
  }

  res.set('Content-Type', 'application/xml');

  return res.render('pages/sitemap', {
    req: req,
    moment: moment,
    urlMap: urlMap,
    domain: helper.getDomain()
  });
}));

module.exports = router;
