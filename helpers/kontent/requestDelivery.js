const KontentDelivery = require('@kontent-ai/delivery-sdk');
const { deliveryConfig } = require('./config');
const { sleep } = require('../general/helper');
const isPreview = require('./isPreview');
const errorAppInsights = require('../error/appInsights');
const { resolveRichText } = require('../resolve/richText');

// const compomentsInRichText = [];

const defineDeliveryConfig = (config) => {
    deliveryConfig.projectId = config.projectid;
    deliveryConfig.defaultQueryConfig = {};

    const previewApiKey = config.previewapikey;
    const securedApiKey = config.securedapikey;

    if (config.waitForLoadingNewContent || previewApiKey) {
        deliveryConfig.defaultQueryConfig.waitForLoadingNewContent = true;
    }

    if (previewApiKey) {
        deliveryConfig.previewApiKey = previewApiKey;
        deliveryConfig.defaultQueryConfig.usePreviewMode = true;
    }

    if (securedApiKey) {
        deliveryConfig.secureApiKey = securedApiKey;
        deliveryConfig.defaultQueryConfig.useSecuredMode = true;
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
    const deliveryClient = KontentDelivery.createDeliveryClient(deliveryConfig);

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

const removeArchivedLinkedItems = (items) => {
    for (const item of items) {
        for (const prop in item.elements) {
            if (Object.prototype.hasOwnProperty.call(item.elements, prop) && item.system.type !== 'training_course2') {
                if (item.elements[prop] && item.elements[prop].type === 'modular_content') {
                    for (const modularItem of item.elements[prop].linkedItems) {
                        if (modularItem.system.workflowStep === 'archived') {
                            const codename = modularItem.system.codename;
                            item.elements[prop].value = item.elements[prop].value.filter(value => value !== codename);
                            item.elements[prop].linkedItems = item.elements[prop].linkedItems.filter(value => value.system.codename !== codename);
                        }
                    }
                    item.elements[prop].linkedItems = item.elements[prop].linkedItems.filter(value => value.system.workflowStep !== 'archived');
                    item.elements[prop].linkedItems = removeArchivedLinkedItems(item.elements[prop].linkedItems);
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

    if (!(response && response.data)) return response;

    if (error) {
        errorAppInsights.log('DELIVERY_API_ERROR', error.message);
    }

    return response.data;
};

const requestDelivery = async (config) => {
    defineDeliveryConfig(config);
    const query = defineQuery(deliveryConfig, config);
    const queryConfigObject = {};

    query.queryConfig(queryConfigObject);

    let response = await getResponse(query, config);

    if (config.resolveRichText) {
        response = resolveRichText(response, config);
    }

    if (response?.items) {
        if (config.type === 'training_certification_test' || config.type === 'training_survey') {
            return response;
        }

        if (isPreview(config.previewapikey)) {
            response.items = removeArchivedLinkedItems(response.items);
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
