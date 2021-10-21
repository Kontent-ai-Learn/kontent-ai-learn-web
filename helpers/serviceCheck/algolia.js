const axios = require('axios');

const checkAlgolia = async () => {
  const envs = [{
    name: 'Search.AppId',
    errMessage: 'Missing Search.AppId env'
  }, {
    name: 'Search.ApiKey',
    errMessage: 'Missing Search.ApiKey env',
  }, {
    name: 'Search.IndexName',
    errMessage: 'Missing Search.IndexName env',
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
    const response = await axios(`https://${process.env['Search.AppId']}-dsn.algolia.net/1/indexes/${process.env['Search.IndexName']}`, {
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Algolia-Application-Id': process.env['Search.AppId'],
        'X-Algolia-API-Key': process.env['Search.ApiKey']
      }
    });

    if (response.status >= 200 && response.status <= 299) {
      data.isSuccess = true;
      delete data.message;
    }
  } catch (error) {
    if (!error.response) {
      data.message = 'Invalid Search.AppId env';
    } else if (error.response.data.status === 403) {
      data.message = 'Invalid Search.ApiKey env';
    } else if (error.response.data.status === 404) {
      data.message = 'Invalid earch.IndexName env';
    } else {
      data.message = error.response.data.message
    }
  }

  return data;
};

module.exports = checkAlgolia;
