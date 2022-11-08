const createError = (error) => {
  const errorAppInsights = require('../error/appInsights');
  errorAppInsights.log('LICENSES_ERROR', error);
  return { error: error };
};

const getLicensesHtml = async () => {
  const axios = require('axios');
  try {
    return await axios({
        method: 'get',
        url: process.env.LICENSES_ENDPOINT,
    });
  } catch (error) {
    return createError(error);
  }
};

const getLicensesItem = async (client) => {
  try {
    return await client.viewLanguageVariant()
      .byItemCodename(process.env.LICENSES_CODENAME)
      .byLanguageCodename(process.env.KONTENT_LANGUAGE_CODENAME_DEFAULT)
      .toPromise();
  } catch (error) {
    return createError(error.message);
  }
};

const newVersionLicensesItem = async (client) => {
  try {
    return await client.createNewVersionOfLanguageVariant()
      .byItemCodename(process.env.LICENSES_CODENAME)
      .byLanguageCodename(process.env.KONTENT_LANGUAGE_CODENAME_DEFAULT)
      .toPromise();
  } catch (error) {
    return createError(error.message);
  }
};

const cancelScheduleLicensesItem = async (client) => {
  try {
    return await client.cancelSheduledPublishingOfLanguageVariant()
      .byItemCodename(process.env.LICENSES_CODENAME)
      .byLanguageCodename(process.env.KONTENT_LANGUAGE_CODENAME_DEFAULT)
      .toPromise();
  } catch (error) {
    return createError(error.message);
  }
};

const upsertLicensesItem = async (client, html) => {
  try {
    return await client.upsertLanguageVariant()
      .byItemCodename(process.env.LICENSES_CODENAME)
      .byLanguageCodename(process.env.KONTENT_LANGUAGE_CODENAME_DEFAULT)
      .withData((builder) => [
        builder.richTextElement({
          element: {
              codename: 'content'
          },
          value: html
        })
      ])
      .toPromise();
  } catch (error) {
    return createError(error.message);
  }
};

const publishLicensesItem = async (client) => {
  try {
    return await client.publishLanguageVariant()
    .byItemCodename(process.env.LICENSES_CODENAME)
    .byLanguageCodename(process.env.KONTENT_LANGUAGE_CODENAME_DEFAULT)
    .withoutData()
    .toPromise();
  } catch (error) {
    return createError(error.message);
  }
};

const getLicensesItemWorkflowStep = (item, steps) => {
  return steps.data.find((step) => step.id === item.data.workflowStep.id);
};

const createUpdate = async (res) => {
  const { createManagementClient } = require('@kontent-ai/management-sdk');

  const html = await getLicensesHtml();
  if (html.error) return html;

  const client = createManagementClient({
    projectId: process.env.KONTENT_PROJECT_ID,
    apiKey: process.env.KONTENT_MANAGEMENT_API_KEY
  });

  const workflowSteps = await client.listWorkflowSteps().toPromise();
  if (workflowSteps.error) return workflowSteps;

  let languageVariant = await getLicensesItem(client);
  if (languageVariant.error) return languageVariant;

  let languageVariantWorkflowStep = getLicensesItemWorkflowStep(languageVariant, workflowSteps);

  if (languageVariantWorkflowStep.codename === 'scheduled') {
    await cancelScheduleLicensesItem(client);

    languageVariant = await getLicensesItem(client);
    if (languageVariant.error) return languageVariant;

    languageVariantWorkflowStep = getLicensesItemWorkflowStep(languageVariant, workflowSteps);
  }

  if (languageVariantWorkflowStep.codename === 'published' ||
      languageVariantWorkflowStep.codename === 'to_be_archived' ||
      languageVariantWorkflowStep.codename === 'archived') {
        const newVersionResponse = await newVersionLicensesItem(client);
        if (newVersionResponse.error) return newVersionResponse;
  }

  const upsertResponse = await upsertLicensesItem(client, html.data);
  if (upsertResponse.error) return upsertResponse;

  const publishResponse = await publishLicensesItem(client);
  if (publishResponse.error) return publishResponse;

  return null;
};

module.exports = {
  createUpdate
};
