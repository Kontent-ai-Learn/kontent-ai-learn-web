const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const getContent = require('../helpers/kontent/getContent');
const helper = require('../helpers/general/helper');
const cacheHandle = require('../helpers/cache/handle');

router.get('/', asyncHandler(async (req, res) => {
  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return getContent.UIMessages(res);
  });

  res.set('Content-Type', 'application/opensearchdescription+xml');

  return res.render('pages/opensearch', {
    req: req,
    domain: helper.getDomain(),
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    helper: helper
  });
}));

module.exports = router;
