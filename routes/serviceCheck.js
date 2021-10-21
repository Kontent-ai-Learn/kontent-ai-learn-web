const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const checkKKProject = require('../helpers/serviceCheck/kkProject');
const checkAlgolia = require('../helpers/serviceCheck/algolia');
const checkSubscriptionService = require('../helpers/serviceCheck/subscriptionService');
const checkApiReferences = require('../helpers/serviceCheck/apiReferences');

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
