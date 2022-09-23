const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Europe/Prague');

const helper = require('../helpers/general/helper');
const getUrlMap = require('../helpers/general/urlMap');

router.get('/', asyncHandler(async (req, res, next) => {
  const urlMap = await getUrlMap(res, true);

  if (!urlMap[0]) {
    return next();
  }

  res.set('Content-Type', 'application/xml');

  return res.render('pages/sitemap', {
    req: req,
    dayjs: dayjs,
    urlMap: urlMap,
    domain: helper.getDomain()
  });
}));

module.exports = router;
