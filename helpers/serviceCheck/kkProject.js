const axios = require('axios');

const checkKKProject = async () => {
  const projectId = process.env.KONTENT_PROJECT_ID;
  const securedApiKey = process.env.KONTENT_SECURE_API_KEY;
  const previewApiKey = process.env.KONTENT_PREVIEW_API_KEY;
  let host = '';
  let apiKey = '';

  if (!projectId) {
    return {
      isSuccess: false,
      message: 'Missing KONTENT_PROJECT_ID env'
    };
  }

  if (!(securedApiKey || previewApiKey)) {
    return {
      isSuccess: false,
      message: 'Missing one of the envs KONTENT_SECURE_API_KEY or KONTENT_PREVIEW_API_KEY'
    };
  }

  if (securedApiKey && previewApiKey) {
    return {
      isSuccess: false,
      message: 'There are both envs KONTENT_SECURE_API_KEY and KONTENT_PREVIEW_API_KEY specified, there must be only one of them.'
    };
  }

  if (securedApiKey) {
    host = 'https://deliver.kontent.ai';
    apiKey = securedApiKey;
  } else if (previewApiKey) {
    host = 'https://preview-deliver.kontent.ai';
    apiKey = previewApiKey;
  }

  try {
    const url = `${host}/${projectId}/items?limit=1`;
    const response = await axios({
      method: 'get',
      url: url,
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (response.data) {
      return {
        isSuccess: true
      };
    }
  } catch (err) {
    return {
      isSuccess: false,
      message: `There is a problem requesting Delivery API. Original message: ${err.message}`
    };
  }

  return {
    isSuccess: false,
    message: 'Unknown problem'
  };
};

module.exports = checkKKProject;
