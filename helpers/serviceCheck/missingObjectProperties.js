const cache = require('memory-cache')

const checkMissingObjectProperties = () => {
  const logs = cache.get('missing-object-property');

  if (logs && logs.length) {
    return {
      isSuccess: false,
      message: 'There are missing object properties. <a href="/learn/service/keys/missing-object-property/" target="_blank">Check the logs</a>.'
    };
  }

  return {
    isSuccess: true
  };
};

module.exports = checkMissingObjectProperties;
