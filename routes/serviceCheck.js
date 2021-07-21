const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const axios = require('axios');

router.get('/', (req, res, next) => {
  res.render('pages/serviceCheck');
});

router.get('/kk-project', asyncHandler(async (req, res, next) => {
  const projectId = process.env['KC.ProjectId'];
  const securedApiKey = process.env['KC.SecuredApiKey'];
  const previewApiKey = process.env['KC.PreviewApiKey'];
  let host = '';
  let apiKey = '';
  res.set('Content-Type', 'application/json');

  if (!projectId) {
    return res
      .send({
        isSuccess: false,
        message: 'Missing Project ID'
      });
  }

  if (!(securedApiKey || previewApiKey)) {
    return res
      .send({
        isSuccess: false,
        message: 'Missing one of the API keys for Secure access or Preview API'
      });
  }

  if (securedApiKey && previewApiKey) {
    return res
      .send({
        isSuccess: false,
        message: 'There are both API keys for Secure access or Preview API, there must be only one of them.'
      });
  }

  if (securedApiKey) {
    host = 'https://deliver.kontent.ai';
    apiKey = securedApiKey;
  } else if (previewApiKey) {
    host = 'https://preview-deliver.kontent.ai';
    apiKey = previewApiKey;
  }

  try {
    const url = `${host}/${projectId}/items?limit=1`;
    const response = await axios({
      method: 'get',
      url: url,
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (response.data) {
      return res
        .send({
          isSuccess: true
        });
    }
  } catch (err) {
    return res
      .send({
        isSuccess: false,
        message: `There is a problem requesting Delivery API. Original message: ${err.message}`
      });
  }

  return res
    .send({
      isSuccess: false,
      message: 'Unknown problem'
    });
}));

module.exports = router;
