const axios = require('axios');
const errorEmail = require('../error/email');
const errorAppInsights = require('../error/appInsights');
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const { isCodenameInMultipleChoice } = require('../general/helper');
const userProfile = require('../user/profile');

const getTrainingUser = async (email, res) => {
  const trainingUsers = await cacheHandle.evaluateSingle(res, 'trainingUsers', async () => {
    return await getContent.traniningUser(res);
  });

  return trainingUsers.find(item => item.elements.email.value === email);
};

const userHasElearningAccess = async (user, res) => {
  if (user.email.endsWith('@kontent.ai') || user.isTrainigUser) {
    return true;
  }

  const userSubscriptions = user?.customerSuccessSubscriptions;
  if (!userSubscriptions) return false;

  const trainingSubscriptions = await cacheHandle.ensureSingle(res, 'trainingSubscriptions', async () => {
    return await getContent.trainingSubscriptions(res);
  });

  for (let i = 0; i < userSubscriptions.length; i++) {
    if (userSubscriptions[i].isPartner || userSubscriptions[i].isMvp) {
      return true;
    }

    for (let j = 0; j < userSubscriptions[i].activePackages.length; j++) {
      for (let k = 0; k < trainingSubscriptions.length; k++) {
        if (userSubscriptions[i].activePackages[j].name.includes(trainingSubscriptions[k].elements.subscription_service_package_code_name.value)) {
          return true;
        }
      }
    }
  }
  return false;
};

const isCourseAvailable = async (user, content, res) => {
  if (!user || user.error_id) return false;
  const isFreeCourse = content?.elements?.is_free ? isCodenameInMultipleChoice(content.elements.is_free.value, 'yes') : false;
  if (isFreeCourse) return true;
  return await userHasElearningAccess(user, res);
};

const getSubscriptionServiceUser = async (email) => {
  const url = `${process.env.SUBSCRIPTION_SERVICE_URL}${email}/`;

  try {
    return await axios({
      method: 'get',
      url: url,
      headers: {
        Authorization: `Bearer ${process.env.SUBSCRIPTION_SERVICE_BEARER}`
      }
    });
  } catch (error) {
    if (email.endsWith('@kontent.ai')) return null;
    if (!error.response) {
      error.response = {
        data: {
          message: `Invalid request to ${url}`
        }
      };
    }
    if (typeof error.response.data === 'string') {
      error.response.data = { message: error.response.data };
    }

    errorEmail.send({
      recipient: process.env.SENDGRID_EMAIL_ADDRESS_TO,
      subject: 'Unable to obtain user form Subscription Service',
      content: error.response.data
    });
    errorAppInsights.log('SUBSCRIPTION_SERVICE_ERROR', error);

    return error.response.data;
  }
};

const getUser = async (email, res) => {
  if (!email) return null;
  const trainingUser = await getTrainingUser(email, res);
  let user = {};

  if (trainingUser) {
    user.email = email;
    user.firstName = trainingUser.first_name.value;
    user.lastName = trainingUser.last_name.value;
    user.isTrainigUser = true;
  } else {
    user = await getSubscriptionServiceUser(email);
    if (user?.data) user = user.data;
  }

  if (user.error_id) return user;

  await userProfile.createUpdate(email, {
    firstName: user.firstName,
    lastName: user.lastName,
  }, res);

  if (user.email) return user;

  return {
    email: email
  };
};

module.exports = {
  getUser,
  isCourseAvailable,
  userHasElearningAccess,
};
