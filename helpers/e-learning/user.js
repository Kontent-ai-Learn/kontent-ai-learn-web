const subscriptionService = require('./subscriptionService');
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const { isCodenameInMultipleChoice } = require('../general/helper');

const getTrainingUser = async (email, res) => {
  const trainingUsers = await cacheHandle.evaluateSingle(res, 'trainingUsers', async () => {
    return await getContent.traniningUser(res);
  });

  return trainingUsers.find(item => item.email.value === email);
};

const userHasElearningAccess = async (user, res) => {
  if (user.email.endsWith('@kentico.com') || user.isTrainigUser) {
    return true;
  }

  const userSubscriptions = user.customerSuccessSubscriptions;

  const trainingSubscriptions = await cacheHandle.ensureSingle(res, 'trainingSubscriptions', async () => {
    return await getContent.trainingSubscriptions(res);
  });

  for (let i = 0; i < userSubscriptions.length; i++) {
    if (userSubscriptions[i].isPartner || userSubscriptions[i].isMvp) {
      return true;
    }

    for (let j = 0; j < userSubscriptions[i].activePackages.length; j++) {
      for (let k = 0; k < trainingSubscriptions.length; k++) {
        if (userSubscriptions[i].activePackages[j].name.includes(trainingSubscriptions[k].subscription_service_package_code_name.value)) {
          return true;
        }
      }
    }
  }
};

const isCourseAvailable = async (user, content, res) => {
  if (!user || user.error_id) return false;
  const isFreeCourse = content?.is_free ? isCodenameInMultipleChoice(content.is_free.value, 'yes') : false;
  if (isFreeCourse) return true;
  return await userHasElearningAccess(user, res);
};

const getUser = async (email, res) => {
  if (email) {
    const trainingUser = await getTrainingUser(email, res);
    const user = {};

    if (trainingUser) {
      user.email = email;

      if (trainingUser) {
        user.firstName = trainingUser.first_name.value;
        user.lastName = trainingUser.last_name.value;
        user.isTrainigUser = true;
      }
      return user;
    } else {
      const user = await subscriptionService.getUser(email);
      if (user.error_id) return user;
      if (user.data) return user.data;
      return {
        email: email
      }
      if (!user.email.endsWith('@kentico.com')) {
        errCode = userSubscriptionService.errCode;
      }
    }
  }
  return null;
};

module.exports = {
  getUser,
  isCourseAvailable,
  userHasElearningAccess,
}
