const checkKKProject = require('./kkProject');
const checkAlgolia = require('./algolia');
const checkSubscriptionService = require('./subscriptionService');
const checkApiReferences = require('./apiReferences');
const checkTlms = require('./tlms');

const checkAll = async () => {
  const checkItems = [{
    name: 'KK Project',
    method: checkKKProject
  }, {
    name: 'Algolia',
    method: checkAlgolia
  }, {
    name: 'Subscription Service',
    method: checkSubscriptionService
  }, {
    name: 'API References',
    method: checkApiReferences
  }, {
    name: 'TLMS',
    method: checkTlms
  }];
  const resultItems = [];

  for (const check of checkItems) {
    const result = await check.method();
    resultItems.push({
      name: check.name,
      result: result
    })
  }

  return resultItems;
};

module.exports = checkAll;
