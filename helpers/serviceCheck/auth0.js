const checkAuth0 = async () => {
  const envs = [{
    name: 'AUTH0_CLIENT_ID',
    errMessage: 'Missing AUTH0_CLIENT_ID env'
  }, {
    name: 'AUTH0_ISSUER_BASE_URL',
    errMessage: 'Missing AUTH0_ISSUER_BASE_URL env',
  }, {
    name: 'AUTH0_DOMAIN',
    errMessage: 'Missing AUTH0_DOMAIN env',
  }, {
    name: 'AUTH0_LOGOUT_URL',
    errMessage: 'Missing AUTH0_LOGOUT_URL env',
  }];

  for (let i = 0; i < envs.length; i++) {
    if (!process.env[envs[i].name]) {
      return {
        isSuccess: false,
        message: envs[i].errMessage
      };
    }
  }

  return {
    isSuccess: true,
    message: ''
  };
};

module.exports = checkAuth0;
