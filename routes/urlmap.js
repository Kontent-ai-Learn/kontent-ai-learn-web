const asyncHandler = require('express-async-handler');
const handleCache = require('../helpers/handleCache');

let getUrlMap;
if (process.env.KK_NEW_STRUCTURE === 'true') {
  getUrlMap = require('../helpers/urlMap');
} else {
  getUrlMap = require('../helpers/urlMap_Obsolete');
}

const urlMap = asyncHandler(async (req, res) => {
  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  return res.json(urlMap);
});

module.exports = urlMap;
