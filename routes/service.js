const express = require('express');
const router = express.Router();
const { getPathWithoutTrailingSlash } = require('../helpers/general/helper');

const fastly = require('../helpers/services/fastly');
const jwtCheck = require('../helpers/services/jwt');
const redirects = require('../helpers/services/redirects');
const { cacheKeys, cacheKeyDetail, cacheKeyInvalidate } = require('../helpers/services/cacheKeys');

const checkKKProject = require('../helpers/serviceCheck/kkProject');
const checkAlgolia = require('../helpers/serviceCheck/algolia');
const checkSubscriptionService = require('../helpers/serviceCheck/subscriptionService');
const checkApiReferences = require('../helpers/serviceCheck/apiReferences');
const checkScorm = require('../helpers/serviceCheck/scorm');
const checkAuth0 = require('../helpers/serviceCheck/auth0');
const checkSendgrid = require('../helpers/serviceCheck/sendgrid');
const checkCosmosDb = require('../helpers/serviceCheck/cosmosDb');
const checkMissingObjectProperties = require('../helpers/serviceCheck/missingObjectProperties');
const checkLicenses = require('../helpers/serviceCheck/licenses');
const checkRedoclyGithub = require('../helpers/serviceCheck/redoclyGithub');

router.get('*', (req, res) => {
  return res.render('pages/service');
});

router.post('*', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  if (!(req.user.email.endsWith('@kontent.ai') || req.user.email.endsWith('@milanlund.com'))) return res.status(403).end();

  const urlSegments = getPathWithoutTrailingSlash(req.originalUrl).replace('/learn/service/', '').split('/');
  let response = null;
  let type = urlSegments[0];

  switch (urlSegments[0]) {
    case 'redirects':
      response = await redirects(res);
      break;
    case 'keys':
      if (urlSegments[1] && urlSegments[2] &&urlSegments[2] === 'invalidate') {
        type += 'invalidate';
        response = await cacheKeyInvalidate(urlSegments[1], res);
      } else if (urlSegments[1]) {
        type += 'detail';
        response = await cacheKeyDetail(urlSegments[1]);
      } else {
        response = await cacheKeys();
      }
      break;
    case 'check':
      if (!urlSegments[1]) {
        return res.send({ type: type });
      }
      switch (urlSegments[1]) {
        case 'kk-project':
          response = await checkKKProject();
          break;
        case 'algolia':
          response = await checkAlgolia();
          break;
        case 'subscription-service':
          response = await checkSubscriptionService();
          break;
        case 'api-references':
          response = await checkApiReferences();
          break;
        case 'scorm':
          response = await checkScorm();
          break;
        case 'auth0':
          response = await checkAuth0();
          break;
        case 'sendgrid':
          response = await checkSendgrid();
          break;
        case 'cosmosdb':
          response = await checkCosmosDb();
          break;
        case 'missing-object-property':
          response = await checkMissingObjectProperties();
          break;
        case 'licenses':
          response = await checkLicenses();
          break;
        case 'redocly-github':
          response = await checkRedoclyGithub();
          break;
        default:
          response = {
            isSuccess: false,
            message: 'Unknown service name'
          };
      }
    res.set('Content-Type', 'application/json');
    return res.send(response);
  }

  if (response) {
    return res.send({
      type: type,
      body: response
    });
  }

  return res.status(404).end();
});

module.exports = router;
