const subscriptionService = require('./subscriptionService');
const handleCache = require('../handleCache');
const commonContent = require('../commonContent');
const helper = require('../helperFunctions');

const getTrainingUser = async (email, res) => {
  const trainingUsers = await handleCache.evaluateSingle(res, 'trainingUsers', async () => {
    return await commonContent.getTraniningUser(res);
  });

  return trainingUsers.find(item => item.email.value === email);
};

const isCourseAvailable = async (user, content, trainingUser, res) => {
  const isFreeCourse = content?.is_free ? helper.isCodenameInMultipleChoice(content?.is_free.value, 'yes') : false;

  if (user.email.endsWith('@kentico.com') || isFreeCourse || trainingUser) {
    return true;
  }

  const userSubscriptions = user.customerSuccessSubscriptions;

  const trainingSubscriptions = await handleCache.ensureSingle(res, 'trainingSubscriptions', async () => {
    return await commonContent.getTrainingSubscriptions(res);
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

  return false;
};

const getUser = async (email, res) => {
  let user = {};
  let errCode, trainingUser;

  if (email) {
    trainingUser = await getTrainingUser(email, res);
    if (trainingUser) {
      user.email = email;
      user.firstName = trainingUser.first_name.value;
      user.lastName = trainingUser.last_name.value;
    } else {
      const userSubscriptionService = await subscriptionService.getUser(email);
      user = userSubscriptionService.user?.data;
      if (!user) {
        user = {
          email: email
        }
      }
      errCode = userSubscriptionService.errCode;
    }
  }

  return {
    user,
    trainingUser,
    errCode
  }
};

module.exports = {
  getUser,
  isCourseAvailable,
}
