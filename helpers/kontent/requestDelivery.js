const { DeliveryClient } = require('@kentico/kontent-delivery');
const { deliveryConfig } = require('./config');
const enhanceMarkup = require('../resolve/enhanceMarkup');
const { removeUnderscoreElems, sleep, removeLinkedItemsSelfReferences } = require('../general/helper');
const isPreview = require('./isPreview');
const errorAppInsights = require('../error/appInsights');

const resolveRichText = require('../resolve/richText');
const resolveLinks = require('../resolve/links');
const compomentsInRichText = [];

const defineDeliveryConfig = (config) => {
    deliveryConfig.projectId = config.projectid;
    deliveryConfig.globalQueryConfig = {};

    const previewApiKey = config.previewapikey;
    const securedApiKey = config.securedapikey;

    if (previewApiKey) {
        deliveryConfig.previewApiKey = previewApiKey;
        deliveryConfig.globalQueryConfig.usePreviewMode = true;
    }

    if (securedApiKey) {
        deliveryConfig.secureApiKey = securedApiKey;
        deliveryConfig.globalQueryConfig.useSecuredMode = true;
    }
};

const addQueryToOrder = (query, config) => {
    if (config.order.field && config.order.type) {
        if (config.order.type === 'descending') {
            query.orderByDescending(config.order.field);
        }

        if (config.order.type === 'ascending') {
            query.orderByAscending(config.order.field);
        }
    }

    return query;
};

const defineQuery = (deliveryConfig, config) => {
    const deliveryClient = new DeliveryClient(deliveryConfig);

    if (config.data === 'type' && config.type) {
        return deliveryClient.type(config.type);
    }

    if (config.data === 'languages') {
        return deliveryClient.languages();
    }

    if (config.data === 'taxonomy') {
        return deliveryClient.taxonomy(config.taxonomy);
    }

    let query = deliveryClient.items();

    query.notEqualsFilter('system.workflow_step', 'archived');

    if (config.type) {
        query.type(config.type);
    }
    if (config.types) {
        query.types(config.types);
    }
    if (config.codename) {
        query.equalsFilter('system.codename', config.codename);
    }
    if (config.depth) {
        query.depthParameter(config.depth);
    }
    if (config.slug) {
        query.equalsFilter('elements.url', config.slug);
    }
    if (config.limit) {
        query.limitParameter(config.limit)
    }
    if (config.order) {
        query = addQueryToOrder(query, config);
    }

    return query;
};

const componentsResolvers = [{
    type: 'embedded_content',
    resolver: resolveRichText.embeddedContent
}, {
    type: 'signpost',
    resolver: resolveRichText.signpost
}, {
    type: 'signpost_item',
    resolver: resolveRichText.signpostItem
}, {
    type: 'callout',
    resolver: resolveRichText.callout
}, {
    type: 'home__link_to_content_item',
    resolver: resolveRichText.homeLinkToContentItem
}, {
    type: 'image',
    resolver: resolveRichText.image
}, {
    type: 'call_to_action',
    resolver: resolveRichText.callToAction
}, {
    type: 'home__link_to_external_url',
    resolver: resolveRichText.homeLinkToExternalUrl
}, {
    type: 'code_sample',
    resolver: resolveRichText.codeSample
}, {
    type: 'code_samples',
    resolver: resolveRichText.codeSamples
}, {
    type: 'content_chunk',
    resolver: resolveRichText.contentChunk
}, {
    type: 'content_switcher',
    resolver: resolveRichText.contentSwitcher
}, {
    type: 'release_note',
    resolver: resolveRichText.releaseNote
}, {
    type: 'changelog',
    resolver: resolveRichText.changelog
}, {
    type: 'terminology',
    resolver: resolveRichText.terminology
}, {
    type: 'training_course2',
    resolver: resolveRichText.trainingCourse
}, {
    type: 'quote',
    resolver: resolveRichText.quote
}, {
    type: 'carousel',
    resolver: resolveRichText.carousel
}, {
    type: 'run_in_postman_button',
    resolver: resolveRichText.runInPostmanButton
}, {
    type: 'run_in_postman_button',
    resolver: richTextResolverTemplates.runInPostmanButton
}, {
    type: 'training_question_for_survey_and_test',
    resolver: resolveRichText.question
}, {
    type: 'training_question_free_text',
    resolver: resolveRichText.questionFreeText
}, {
    type: 'training_answer_for_survey_and_test',
    resolver: resolveRichText.answer
}, {
    type: 'training_certification_test',
    resolver: resolveRichText.certificationTest
}];

const richTextResolver = (item, config) => {
    item = resolveLinks.resolveInnerRichTextLinks(item, config);

    for (let i = 0; i < config.componentsResolvers.length; i++) {
        if (item.system.type === config.componentsResolvers[i].type) {
            compomentsInRichText.push({
                codename: item.system.codename,
                type: config.componentsResolvers[i].type
            });

            if (config.richTextResolvers) {
                for (let j = 0; j < config.richTextResolvers.length; j++) {
                    if (config.richTextResolvers[j].type === config.componentsResolvers[i].type) {
                        config.customField = config.richTextResolvers[j].custom;
                        return config.richTextResolvers[j].resolver(item, config);
                    }
                }
            }

            return config.componentsResolvers[i].resolver(item, config);
        }
    }

    return `Missing Rich text resolver for the ${item.system.type} type.`;
};

const resolveLink = (link, config) => {
    if (config.urlMap && config.urlMap.length) {
        return resolveLinks.resolve(link, config);
    } else {
        return '/';
    }
};

const extendLinkedItems = (response) => {
    if (response && response.items) {
        for (const item of response.items) {
            for (const prop in item) {
                if (Object.prototype.hasOwnProperty.call(item, prop)) {
                    if (item[prop] && item[prop].type === 'rich_text') {
                        item[prop].linkedItems_custom = [];
                        for (const component of compomentsInRichText) {
                            for (const linkedItem of item[prop].linkedItemCodenames) {
                                if (component.codename === linkedItem) {
                                    item[prop].linkedItems_custom.push(component);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return response;
};

const removeArchivedLinkedItems = (items) => {
    for (const item of items) {
        for (const prop in item) {
            if (Object.prototype.hasOwnProperty.call(item, prop) && item.system.type !== 'training_course2') {
                if (item[prop] && item[prop].type === 'modular_content') {
                    for (const modularItem of item[prop].value) {
                        if (modularItem._raw.system.workflow_step === 'archived') {
                            const codename = modularItem.system.codename;
                            item[prop].rawData.value = item[prop].rawData.value.filter(value => value !== codename);
                            item[prop].itemCodenames = item[prop].itemCodenames.filter(value => value !== codename);
                        }
                    }
                    item[prop].value = item[prop].value.filter(value => value._raw.system.workflow_step !== 'archived');
                    item[prop].value = removeArchivedLinkedItems(item[prop].value);
                }
            }
        }
    }

    return items;
};

const getResponse = async (query, config) => {
    let error;
    let response = await query
        .toPromise()
        .catch(err => {
            error = err;
        });

    // Retry in case of stale content or error
    const temps = [0];
    for await (let temp of temps) {
        if ((!error && ((response && response.hasStaleContent) || !response)) || error) {
            error = null;
            await sleep(5000);
            response = await query
                .toPromise()
                .catch(err => {
                    error = err;
                });

            if (temp < 5) {
                temps.push(++temp);
            }
        }
    }

    if (response && response.items) {
        response.items = removeLinkedItemsSelfReferences(response.items);

        if (isPreview(config.previewapikey)) {
            response.items = removeArchivedLinkedItems(response.items);
        }
    }

    if (config.resolveRichText && response && response.items) {
        response.items.forEach((elem) => {
            const keys = removeUnderscoreElems(Object.keys(elem));

            if (keys.length) {
                keys
                    .filter((key) => Object.prototype.hasOwnProperty.call(elem, key) && Object.prototype.hasOwnProperty.call(elem[key], 'type') && elem[key].type === 'rich_text')
                    .forEach((key) => {
                        if (elem[key]) {
                            elem[key].resolveHtml();
                            elem[key].value = enhanceMarkup(elem[key].resolvedData, config);
                        }
                    });
            }
        });
    }

    if (error) {
        errorAppInsights.log('DELIVERY_API_ERROR', error.message);
    }

    return response;
};

const requestDelivery = async (config) => {
    defineDeliveryConfig(config);
    config.componentsResolvers = componentsResolvers;
    const query = defineQuery(deliveryConfig, config);
    const queryConfigObject = {};

    if (config.resolveRichText) {
        queryConfigObject.richTextResolver = (item) => {
            return richTextResolver(item, config);
        };
        queryConfigObject.urlSlugResolver = (link) => {
            const links = resolveLink(link, config);
            return { url: links };
        };
    }

    query.queryConfig(queryConfigObject);

    let response = await getResponse(query, config);
    response = extendLinkedItems(response);

    if (response?.items) {
        if (config.type === 'training_certification_test' || config.type === 'training_survey') {
            return response;
        }
        return response.items;
    }
    if (response?.type) {
        return response.type;
    }
    if (response?.languages) {
        return response.languages;
    }

    return response;
};

module.exports = requestDelivery;
