const axios = require('axios');
const errorEmail = require('../error/email');
const errorAppInsights = require('../error/appInsights');
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const userProfile = require('../user/profile');

const getTrainingUser = async (email, res) => {
  const trainingUsers = await cacheHandle.evaluateSingle(res, 'trainingUsers', async () => {
    return await getContent.traniningUser(res);
  });

  return trainingUsers.find(item => item.elements.email.value === email);
};

const isClient = async (user, res) => {
  if (user.isTrainigUser) {
    return true;
  }
  const userSubscriptions = user?.customerSuccessSubscriptions;
  if (!userSubscriptions) return false;

  const trainingSubscriptions = await cacheHandle.ensureSingle(res, 'trainingSubscriptions', async () => {
    return await getContent.trainingSubscriptions(res);
  });

  for (let i = 0; i < userSubscriptions.length; i++) {
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

const isPartner = (user) => {
  const userSubscriptions = user?.customerSuccessSubscriptions;
  if (!userSubscriptions) return false;

  for (let i = 0; i < userSubscriptions.length; i++) {
    if (userSubscriptions[i].isPartner || userSubscriptions[i].isMvp) {
      return true;
    }
  }
  return false;
};

const isEmployee = (user) => {
  if (user.email && (user.email.endsWith('@kontent.ai') || user.email.endsWith('@milanlund.com'))) {
    return true;
  }

  return false;
};

const isCourseAvailable = (user, content) => {
  if (!user || user.error_id) return false;

  const courseAccessLevel = content?.elements?.access.value[0].codename;
  switch (courseAccessLevel) {
    case 'free':
      return true;
    case 'clients_partners_employees':
      if (user.accessLevel.partner || user.accessLevel.employee || user.accessLevel.client) return true;
      return true;
    case 'partners_employees':
      if (user.accessLevel.partner || user.accessLevel.employee) return true;
      return false;
    case 'employees':
      if (user.accessLevel.employee) return true;
      return false;
    default:
      return false;
  }
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

const getAccessLevel = async (user, res) => {
  const userIsPartner = isPartner(user);
  const userIsClient = await isClient(user, res);
  const userIsEmployee = isEmployee(user);

  return {
    partner: userIsPartner,
    client: userIsClient,
    employee: userIsEmployee
  }
};

const getUser = async (email, res) => {
  if (!email) return null;
  const trainingUser = await getTrainingUser(email, res);
  let user = {};

  if (trainingUser) {
    user.email = email;
    user.firstName = trainingUser.elements.first_name.value;
    user.lastName = trainingUser.elements.last_name.value;
    user.isTrainigUser = true;
  } else {
    user = await getSubscriptionServiceUser(email);
    if (user?.data) user = user.data;
  }

  user.accessLevel = await getAccessLevel(user, res);

  if (user.error_id) return user;

  await userProfile.createUpdate(email, {
    firstName: user.firstName,
    lastName: user.lastName,
  }, res);

  if (user.email) return user;

  return {
    email: email,
    accessLevel: user.accessLevel
  };
};

module.exports = {
  getUser,
  isCourseAvailable,
};
