const axios = require('axios');

const checkAlgolia = async () => {
  const envs = [{
    name: 'SEARCH_APP_ID',
    errMessage: 'Missing SEARCH_APP_ID env'
  }, {
    name: 'SEARCH_API_KEY',
    errMessage: 'Missing SEARCH_API_KEY env',
  }, {
    name: 'SEARCH_INDEX_NAME',
    errMessage: 'Missing SEARCH_INDEX_NAME env',
  }];

  for (let i = 0; i < envs.length; i++) {
    if (!process.env[envs[i].name]) {
      return {
        isSuccess: false,
        message: envs[i].errMessage
      };
    }
  }

  const data = {
    isSuccess: false,
    message: ''
  };

  try {
    const response = await axios(`https://${process.env.SEARCH_APP_ID}-dsn.algolia.net/1/indexes/${process.env.SEARCH_INDEX_NAME}`, {
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Algolia-Application-Id': process.env.SEARCH_APP_ID,
        'X-Algolia-API-Key': process.env.SEARCH_API_KEY
      }
    });

    if (response.status >= 200 && response.status <= 299) {
      data.isSuccess = true;
      delete data.message;
    }
  } catch (error) {
    if (!error.response) {
      data.message = 'Invalid SEARCH_APP_ID env';
    } else if (error.response.data.status === 403) {
      data.message = 'Invalid SEARCH_API_KEY env';
    } else if (error.response.data.status === 404) {
      data.message = 'Invalid earch.IndexName env';
    } else {
      data.message = error.response.data.message
    }
  }

  return data;
};

module.exports = checkAlgolia;
