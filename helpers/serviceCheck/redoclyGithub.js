const checkRedoclyGithub = async () => {
  const envs = [{
    name: 'GITHUB_REDOCLY_ACCESS_TOKEN',
    errMessage: 'Missing GITHUB_REDOCLY_ACCESS_TOKEN env'
  }, {
    name: 'GITHUB_REDOCLY_EMAIL',
    errMessage: 'Missing GITHUB_REDOCLY_EMAIL env',
  }, {
    name: 'GITHUB_REDOCLY_OWNER',
    errMessage: 'Missing GITHUB_REDOCLY_OWNER env',
  }, {
    name: 'GITHUB_REDOCLY_REPOSITORY',
    errMessage: 'Missing GITHUB_REDOCLY_REPOSITORY env',
  }, {
    name: 'GITHUB_REDOCLY_USERNAME',
    errMessage: 'Missing GITHUB_REDOCLY_USERNAME env',
  }, {
    name: 'GITHUB_REDOCLY_BRANCH',
    errMessage: 'Missing GITHUB_REDOCLY_BRANCH env',
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
    isSuccess: true,
    message: ''
  };

  return data;
};

module.exports = checkRedoclyGithub;
