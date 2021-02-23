const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const commonContent = require('../helpers/commonContent');
const helper = require('../helpers/helperFunctions');
const handleCache = require('../helpers/handleCache');

router.get('/', asyncHandler(async (req, res) => {
  const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return commonContent.getUIMessages(res);
  });

  res.set('Content-Type', 'application/opensearchdescription+xml');

  return res.render('pages/opensearch', {
    req: req,
    domain: helper.getDomain(),
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
  });
}));

module.exports = router;
