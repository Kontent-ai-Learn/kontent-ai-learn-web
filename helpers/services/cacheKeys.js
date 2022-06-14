const cache = require('memory-cache');
const util = require('util');
const isPreview = require('../kontent/isPreview');
const fastly = require('./fastly');

const cacheKeys = () => {
  const keys = cache.keys();
  keys.sort();
  return { keys };
};

const cacheKeyDetail = (keyName) => {
  const key = cache.get(keyName);
  return util.inspect(key, {
    maxArrayLength: 500
  });
};

const cacheKeyInvalidate = async (keyName, res) => {
  cache.del(keyName);
  if (!isPreview(res.locals.previewapikey)) {
      await fastly.purgeAllUrls(res);
  }
  return { status: 'done' };
};

module.exports = {
  cacheKeys,
  cacheKeyDetail,
  cacheKeyInvalidate
};
