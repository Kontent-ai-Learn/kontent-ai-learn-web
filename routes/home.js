const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const requestDelivery = require('../helpers/requestDelivery');
const getUrlMap = require('../helpers/urlMap');
const minify = require('../helpers/minify');
const isPreview = require('../helpers/isPreview');

router.get('/', asyncHandler(async (req, res, next) => {
  const tree = await requestDelivery({
    type: 'home',
    depth: 4,
    resolveRichText: true,
    urlMap: await getUrlMap({
      projectid: res.locals.projectid,
      previewapikey: res.locals.previewapikey 
    }),
    projectid: res.locals.projectid,
    previewapikey: res.locals.previewapikey
  });

  if (!tree[0]) {
    return next();
  }

  return res.render('pages/home', {
    req: req,
    minify: minify,
    isPreview: isPreview(res.locals.previewapikey),
    title: tree[0].title.value,
    navigation: tree[0].navigation,
    signposts: tree[0].signposts.value
  });
}));

module.exports = router;
