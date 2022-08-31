const axios = require('axios');

const checkSubscriptionService = async () => {
  const envs = [{
    name: 'SUBSCRIPTION_SERVICE_URL',
    errMessage: 'Missing SUBSCRIPTION_SERVICE_URL env'
  }, {
    name: 'SUBSCRIPTION_SERVICE_BEARER',
    errMessage: 'Missing SUBSCRIPTION_SERVICE_BEARER env',
  }, {
    name: 'SUBSCRIPTION_SERVICE_SERVICE_CHECK_EMAIL',
    errMessage: 'Missing SUBSCRIPTION_SERVICE_SERVICE_CHECK_EMAIL env',
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
    const response = await axios(`${process.env.SUBSCRIPTION_SERVICE_URL}${process.env.SUBSCRIPTION_SERVICE_SERVICE_CHECK_EMAIL}/`, {
      headers: {
        Authorization: `Bearer ${process.env.SUBSCRIPTION_SERVICE_BEARER}`
      }
    });

    if (response.status === 200) {
      data.isSuccess = true;
      delete data.message;
    }
  } catch (error) {
    if (error.response?.data?.description) {
      data.message = error.response.data.description;
    } else if (error.response?.data?.Message) {
      data.message = error.response.data.Message;
    } else if (error.response?.data) {
      data.message = error.response.data;
    }
  }

  return data;
};

module.exports = checkSubscriptionService;
