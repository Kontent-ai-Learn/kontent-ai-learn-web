const express = require('express');
const router = express.Router();

const helper = require('../helpers/helperFunctions');

router.get('/', (req, res) => {
  res.set('Content-Type', 'application/opensearchdescription+xml');

  return res.render('tutorials/pages/opensearch', {
    req: req,
    domain: helper.getDomain(),
    shortname: 'Kentico Kontent Docs'
  });
});

module.exports = router;
