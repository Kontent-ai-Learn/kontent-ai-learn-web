const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const helper = require('../helpers/helperFunctions');
const handleCache = require('../helpers/handleCache');
const commonContent = require('../helpers/commonContent');

router.get('/', asyncHandler(async (req, res, next) => {
  const home = await handleCache.ensureSingle(res, 'home', async () => {
      return commonContent.getHome(res);
  });

  res.set('Content-Type', 'application/xml');

  return res.render('tutorials/pages/opensearch', {
    req: req,
    domain: helper.getDomain(),
    shortname: home && home.length ? home[0].title.value : 'Kentico Kontent Docs',
  });
}));

module.exports = router;
