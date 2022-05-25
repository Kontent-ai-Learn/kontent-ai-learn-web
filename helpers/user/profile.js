const cosmos = require('../services/cosmos');
const errorAppInsights = require('../error/appInsights');

const get = async (email) => {
  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_PROFILE);
    const query = {
        query: 'SELECT * FROM c WHERE LOWER(c.email) = @email',
        parameters: [{
          name: '@email',
          value: email.toLowerCase()
        }]
    };

    const { resources } = await db.items.query(query).fetchAll();
    if (resources.length) return resources[0];
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
  }
  return {};
};

const createUpdate = async (email, body) => {
  const user = await get(email);
  let data = {};

  try {
    const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_PROFILE);
    if (user && user.email) {
      const itemToUpdate = await db.item(user.id);
      body.id = user.id;
      data = await itemToUpdate.replace(body);
    } else {
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
