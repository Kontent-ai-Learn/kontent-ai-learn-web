const express = require('express');
const router = express.Router();
const { getPathWithoutTrailingSlash } = require('../helpers/general/helper');

const fastly = require('../helpers/services/fastly');
const jwtCheck = require('../helpers/services/jwt');
const redirects = require('../helpers/services/redirects');

router.get('*', (req, res) => {
  return res.render('pages/service');
});

router.post('*', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  if (!(req.user.email.endsWith('@kentico.com') || req.user.email.endsWith('@milanlund.com'))) return res.status(403).end();

  const urlSegments = getPathWithoutTrailingSlash(req.originalUrl).replace('/learn/service/', '').split('/');
  let response = null;

  switch (urlSegments[0]) {
    case 'redirects':
      response = await redirects(res);
      break;
  }

  if (response) {
    return res.send({
      type: urlSegments[0],
      body: response
    });
  }

  return res.status(404).end();
});

module.exports = router;
