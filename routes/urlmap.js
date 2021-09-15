const asyncHandler = require('express-async-handler');
const handleCache = require('../helpers/handleCache');
const getUrlMap = require('../helpers/urlMap');

const urlMap = asyncHandler(async (req, res) => {
  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  return res.json(urlMap);
});

module.exports = urlMap;
