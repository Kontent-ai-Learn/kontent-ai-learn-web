const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const checkKKProject = require('../helpers/serviceCheck/kkProject');
const checkAlgolia = require('../helpers/serviceCheck/algolia');

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
