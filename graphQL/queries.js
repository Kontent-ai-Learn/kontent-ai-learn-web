const { DeliveryClient } = require('kentico-cloud-delivery');

const { deliveryConfig } = require('../config');

const queryTypes = `
# The "Query" type is the root of all GraphQL queries.
type Query {
  items: [ContentItem],
  itemsByType(type: String!, limit: Int, depth: Int, order: String): [ContentItem]
}
`;

deliveryConfig.enablePreviewMode = (process.env.NODE_ENV || 'development')  === 'development';

const deliveryClient = new DeliveryClient(deliveryConfig);
const resolvers = {
  ContentItem: {
    __resolveType(item, _context, _info) {
      const type = convertSnakeCaseToPascalCase(item);
      return type + 'ContentType';
    }
  },
  Query: {
    items: async () => {
      const response = await deliveryClient.items()
        .getPromise();
      return response.items;
    },
    itemsByType: async (_, { type, limit, depth, order }) => {
      const query = deliveryClient.items()
        .type(type);
      limit && query.limitParameter(limit);
      depth && query.depthParameter(depth);
      order && query.orderParameter(order);

      const response = await query
        .getPromise();
      
      return response.items;
    }
  },
};

const convertSnakeCaseToPascalCase = (item) => {
  return item.system.type
    .split('_')
    .map((str) => str.slice(0, 1).toUpperCase() + str.slice(1, str.length))
    .join('');
}

module.exports = {
  resolvers,
  queryTypes
}

