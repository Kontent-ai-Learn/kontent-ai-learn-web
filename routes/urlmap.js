const asyncHandler = require('express-async-handler');
const cacheHandle = require('../helpers/cache/handle');
const getUrlMap = require('../helpers/general/urlMap');

const urlMap = asyncHandler(async (req, res) => {
  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  return res.json(urlMap);
});

module.exports = urlMap;
