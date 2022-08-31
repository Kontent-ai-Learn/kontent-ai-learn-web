const axios = require('axios');

const getCodenames = async () => {
  const projectId = process.env.KONTENT_PROJECT_ID;
  const securedApiKey = process.env.KONTENT_SECURE_API_KEY;
  const previewApiKey = process.env.KONTENT_PREVIEW_API_KEY;
  let host = '';
  let apiKey = '';

  if (securedApiKey) {
    host = 'https://deliver.kontent.ai';
    apiKey = securedApiKey;
  } else if (previewApiKey) {
    host = 'https://preview-deliver.kontent.ai';
    apiKey = previewApiKey;
  }

  try {
    const url = `${host}/${projectId}/items?system.type=zapi_specification`;
    const response = await axios({
      method: 'get',
      url: url,
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (response.data) {
      return {
        isSuccess: true,
        data: response.data,
        message: ''
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

const checkApiReferences = async () => {
  const envs = [{
    name: 'API_REFERENCES_HOST',
    errMessage: 'Missing API_REFERENCES_HOST env'
  }];

  for (let i = 0; i < envs.length; i++) {
    if (!process.env[envs[i].name]) {
      return {
        isSuccess: false,
        message: envs[i].errMessage
      };
    }
  }

  const data = await getCodenames();
  if (!data.isSuccess) return data;

  for await (const reference of data.data.items) {
    const codename = reference.system.codename;
    try {
      await axios.get(`${process.env.API_REFERENCES_HOST}/api/ProviderStarter?api=${codename}`, {
        timeout: 10000
      });
    } catch (err) {
      data.isSuccess = false;
      if (err.message) {
        data.message = `API codename: ${codename}, Message: ${err.message}`;
      } else {
        data.message = `Unable get API with codename: ${codename}`;
      }
      return data;
    }
  }

  return data;
};

module.exports = checkApiReferences;
