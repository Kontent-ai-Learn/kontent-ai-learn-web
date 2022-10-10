const asyncHandler = require('express-async-handler');
const cacheHandle = require('../helpers/cache/handle');
const getUrlMap = require('../helpers/general/urlMap');

const urlMap = asyncHandler(async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  return res.json(urlMap);
});

module.exports = urlMap;
