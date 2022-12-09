const cosmos = require('../services/cosmos');
const errorAppInsights = require('../error/appInsights');

const get = async (email, res, getOnlyFromDb) => {
  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_PROFILE);
    const query = {
        query: 'SELECT * FROM c WHERE LOWER(c._partitionKey) = @_partitionKey',
        parameters: [{
          name: '@_partitionKey',
          value: email.toLowerCase()
        }]
    };

    const { resources } = await db.items.query(query).fetchAll();
    if (resources.length) return resources[0];
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
  }

  if (!getOnlyFromDb) {
    const elearningUser = require('../e-learning/user');
    return await elearningUser.getUser(email, res);
  }
};

const createUpdate = async (email, body, res) => {
  const user = await get(email, res, true);
  let data = { error: 'No user created/updated.' };
  body.email = email.toLowerCase();

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_PROFILE);
    if (user && user._partitionKey) {
      const itemToUpdate = await db.item(user.id);

      itemToUpdate.id = user.id;
      itemToUpdate.partitionKey = email.toLowerCase();

      const patchBody = { operations: [] };
      Object.keys(body).forEach((key) => {
        patchBody.operations.push({
          op: 'add',
          path: `/${key}`,
          value: body[key] || ''
        });
      });

      data = await itemToUpdate.patch(patchBody);
    } else {
      body._partitionKey = email.toLowerCase();
      data = await db.items.create(body);
    }

    if (data.resource) data = data.resource;
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
  }
  return data;
};

module.exports = {
  get,
  createUpdate
};
