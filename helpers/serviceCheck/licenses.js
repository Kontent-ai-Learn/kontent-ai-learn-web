const axios = require('axios');

const checkLicenses = async () => {
  const projectId = process.env.KONTENT_PROJECT_ID;
  const securedApiKey = process.env.KONTENT_SECURE_API_KEY;
  const previewApiKey = process.env.KONTENT_PREVIEW_API_KEY;
  const managementApiKey = process.env.KONTENT_MANAGEMENT_API_KEY;
  const defaultLanguage = process.env.KONTENT_LANGUAGE_CODENAME_DEFAULT;
  const licensesCodename = process.env.LICENSES_CODENAME;
  const licensesEndpoint = process.env.LICENSES_ENDPOINT;
  let host = '';
  let apiKey = '';

  if (!projectId) {
    return {
      isSuccess: false,
      message: 'Missing KONTENT_PROJECT_ID env'
    };
  }

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

  if (!managementApiKey) {
    return {
      isSuccess: false,
      message: 'Missing KONTENT_MANAGEMENT_API_KEY env'
    };
  }

  if (!defaultLanguage) {
    return {
      isSuccess: false,
      message: 'Missing KONTENT_LANGUAGE_CODENAME_DEFAULT env'
    };
  }

  if (!licensesCodename) {
    return {
      isSuccess: false,
      message: 'Missing LICENSES_CODENAME env'
    };
  }

  if (!licensesEndpoint) {
    return {
      isSuccess: false,
      message: 'Missing LICENSES_ENDPOINT env'
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
    const url = `${host}/${projectId}/items/${licensesCodename}`;
    await axios({
      method: 'get',
      url: url,
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
  } catch (err) {
    return {
      isSuccess: false,
      message: `There is a problem requesting Delivery API or there is no content item with "${licensesCodename}" codename. Original message: ${err.message}`
    };
  }

  try {
    await axios({
      method: 'get',
      url: licensesEndpoint,
    });
  } catch (err) {
    return {
      isSuccess: false,
      message: `There is a problem requesting endpoint stored in the LICENSES_ENDPOINT env. Original message: ${err}`
    };
  }

  try {
    const url = `https://manage.kontent.ai/v2/projects/${projectId}/items`;
    await axios({
      method: 'get',
      url: url,
      headers: {
        Authorization: `Bearer ${managementApiKey}`
      }
    });
  } catch (err) {
    return {
      isSuccess: false,
      message: `There is a problem requesting Management API. Original message: ${err.message}`
    };
  }

  return {
    isSuccess: true
  };
};

module.exports = checkLicenses;
