const axios = require('axios');

const checkTlms = async () => {
  const envs = [{
    name: 'LMS.id',
    errMessage: 'Missing LMS.id env'
  }, {
    name: 'LMS.host',
    errMessage: 'Missing LMS.host env',
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
    const response = await axios(`https://${process.env['LMS.host']}/api/v1/courses`, {
      auth: {
        username: process.env['LMS.id'] || '',
        password: ''
      }
    });
    if (response.status === 200) {
      if (typeof response.data === 'string') {
        data.message = 'Most likely the LMS.host env is invalid'
      } else {
        data.isSuccess = true;
      }
    }
  } catch (err) {
    if (err.message) {
      data.message = err.message

      if (err.response.status === 401) {
        data.message = `${data.message}, Most likely the LMS.id env is invalid`
      }
    }
  }

  return data;
};

module.exports = checkTlms;
