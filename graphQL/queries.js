const {
  DeliveryClient
} = require('kentico-cloud-delivery');
const {
  deliveryConfig
} = require('../config');

const richTextResolverTemplates = require('../helpers/richTextResolverTemplates');

const queryTypes = `
# The "Query" type is the root of all GraphQL queries.
type Query {
  items: [ContentItem],
  itemsByType(type: String!, limit: Int, depth: Int, order: String, urlSlug: String): [ContentItem]
}
`;

deliveryConfig.projectId = process.env['KC.ProjectId'];

if (process.env['KC.PreviewApiKey']) {
  deliveryConfig.previewApiKey = process.env['KC.PreviewApiKey'];
  deliveryConfig.enablePreviewMode = true;
}

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
    itemsByType: async (_, {
      type,
      limit,
      depth,
      order,
      urlSlug
    }) => {
      const query = deliveryClient.items()
        .type(type);
      limit && query.limitParameter(limit);
      depth && query.depthParameter(depth);
      order && query.orderParameter(order);
      urlSlug && query.equalsFilter('elements.url', urlSlug);

      query.queryConfig({
        richTextResolver: (item, context) => {
          if (item.system.type === 'embedded_content') {
            return richTextResolverTemplates.embeddedContent(item);
          }
          if (item.system.type === 'signpost') {
            return richTextResolverTemplates.signpost(item);
          }
        }
      });

      const response = await query
        .getPromise();

      response.items.forEach((elem) => {
        Object.keys(elem)
          .filter((key) => elem.hasOwnProperty(key) && elem[key].hasOwnProperty('type') && elem[key].type === `rich_text`)
          .forEach((key) => {
            elem[key].getHtml();
            elem[key].value = elem[key].resolvedHtml;
          });
      });
      
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