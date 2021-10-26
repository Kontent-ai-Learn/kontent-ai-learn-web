const axios = require('axios');

const checkSubscriptionService = async () => {
  const envs = [{
    name: 'SubscriptionService.Url',
    errMessage: 'Missing SubscriptionService.Url env'
  }, {
    name: 'SubscriptionService.Bearer',
    errMessage: 'Missing SubscriptionService.Bearer env',
  }, {
    name: 'SubscriptionService.ServiceCheckerEmail',
    errMessage: 'Missing SubscriptionService.ServiceCheckerEmail env',
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
    const response = await axios(`${process.env['SubscriptionService.Url']}${process.env['SubscriptionService.ServiceCheckerEmail']}/`, {
      headers: {
        Authorization: `Bearer ${process.env['SubscriptionService.Bearer']}`
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
