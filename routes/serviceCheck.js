const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const checkKKProject = require('../helpers/serviceCheck/kkProject');
const checkAlgolia = require('../helpers/serviceCheck/algolia');
const checkSubscriptionService = require('../helpers/serviceCheck/subscriptionService');
const checkApiReferences = require('../helpers/serviceCheck/apiReferences');
const checkTlms = require('../helpers/serviceCheck/tlms');
const checkScorm = require('../helpers/serviceCheck/scorm');
const checkAuth0 = require('../helpers/serviceCheck/auth0');
const checkSendgrid = require('../helpers/serviceCheck/sendgrid');

router.get('/', (req, res) => {
  return res.render('pages/serviceCheck');
});

router.get('/:codename', asyncHandler(async (req, res) => {
  res.set('Content-Type', 'application/json');
  let result;

  switch (req.params.codename) {
    case 'kk-project':
      result = await checkKKProject();
      break;
    case 'algolia':
      result = await checkAlgolia();
      break;
    case 'subscription-service':
      result = await checkSubscriptionService();
      break;
    case 'api-references':
      result = await checkApiReferences();
      break;
    case 'tlms':
      result = await checkTlms();
      break;
    case 'scorm':
      result = await checkScorm();
      break;
    case 'auth0':
      result = await checkAuth0();
      break;
    case 'sendgrid':
      result = await checkSendgrid();
      break;
    default:
      result = {
        isSuccess: false,
        message: 'Unknown service name'
      };
  }

  return res
    .send(result);
}));

module.exports = router;
