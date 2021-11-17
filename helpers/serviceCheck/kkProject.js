const axios = require('axios');

const checkKKProject = async () => {
  const projectId = process.env['KC.ProjectId'];
  const securedApiKey = process.env['KC.SecuredApiKey'];
  const previewApiKey = process.env['KC.PreviewApiKey'];
  let host = '';
  let apiKey = '';

  if (!projectId) {
    return {
      isSuccess: false,
      message: 'Missing KC.ProjectId env'
    };
  }

  if (!(securedApiKey || previewApiKey)) {
    return {
      isSuccess: false,
      message: 'Missing one of the envs KC.SecuredApiKey or KC.PreviewApiKey'
    };
  }

  if (securedApiKey && previewApiKey) {
    return {
      isSuccess: false,
      message: 'There are both envs KC.SecuredApiKey and KC.PreviewApiKey specified, there must be only one of them.'
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