const KontentDelivery = require('@kontent-ai/delivery-sdk');
const requestDelivery = require('../kontent/requestDelivery');
const { deliveryConfig } = require('../kontent/config');
const { replaceWhitespaceWithDash, sleep, removeLinkedItemsSelfReferences } = require('./helper');
const ensureSingle = require('../cache/ensureSingle');
const errorAppInsights = require('../error/appInsights');
let fields = ['codename', 'url'];

const getMapItem = (data) => {
    const item = {};
    fields.forEach(field => {
        switch (field) {
            case 'id':
                item.id = data.id;
                break;
            case 'codename':
                item.codename = data.codename;
                break;
            case 'url':
                item.url = data.url;
                break;
            case 'date':
                item.date = data.date;
                break;
            case 'visibility':
                item.visibility = data.visibility;
                break;
            case 'type':
                item.type = data.type;
                break;
            default:
                item[field] = 'is-unknown-field';
        }
    });

    return item;
};

const getPlatforms = async (res) => {
    return await ensureSingle(res, 'platformsConfig', async () => {
        const KCDetails = {
            projectid: res.locals.projectid,
            previewapikey: res.locals.previewapikey,
            securedapikey: res.locals.securedapikey
        };

        return await requestDelivery({
            type: 'platform_picker',
            codename: 'platform_picker',
            ...KCDetails
        });
    });
};

const handleMultihandlePlatformArticles = (set) => {
    let queryString = '?tech=';
    const settings = { ...set };

    if (settings.cachedPlatforms && settings.cachedPlatforms.length && settings.item.elements.platform && settings.item.elements.platform.value.length) {
        const tempPlatform = settings.cachedPlatforms[0].elements.options.linkedItems.filter(elem => settings.item.elements.platform.value[0].codename === elem.elements.platform.value[0].codename);
        if (tempPlatform.length) {
            queryString += tempPlatform[0].elements.url.value;
        }
    }

    settings.urlMap.push(getMapItem({
        id: settings.item.system.id,
        codename: settings.item.system.codename,
        url: `/learn/${settings.url.join('/')}/${queryString}`,
        type: settings.item.system.type,
        date: settings.item.system.lastModified,
        visibility: settings.item.visibility && settings.item.visibility.value.length ? settings.item.visibility.value : null
    }));

    return settings.urlMap;
};

const handleReferenceHash = (settings) => {
    let hash = '';

    if (settings.item.system.type === 'zapi__category') {
        hash = `#tag/${replaceWhitespaceWithDash(settings.item.elements.name.value)}`;
    } else if (settings.item.system.type === 'zapi_path_operation') {
        hash = `#operation/${settings.item.elements.url.value}`;
    } else if (settings.item.system.type === 'zapi_security_scheme') {
        hash = '#section/Authentication';
    }

    settings.urlMap.push(getMapItem({
        id: settings.item.system.id,
        codename: settings.item.system.codename,
        url: `/learn/${settings.url.join('/')}/${hash}`,
        type: settings.item.system.type,
        date: settings.item.system.lastModified,
        visibility: settings.item.visibility && settings.item.elements.visibility.value.length ? settings.item.elements.visibility.value : null
    }));

    if (settings.item.elements.path_operations && settings.item.elements.path_operations.linkedItems.length) {
        const elem = settings.item.elements.path_operations.linkedItems;
        for (let i = 0; i < elem.length; i++) {
            settings.item = elem[i];
            handleReferenceHash(settings);
        }
    }

    return settings.urlMap;
};

const handlePlatformArticle = (settings) => {
    for (let i = 0; i < settings.item.elements.platform.value.length; i++) {
        const platform = settings.item.elements.platform.value[i].codename;
        let queryString = '?tech=';

        if (settings.cachedPlatforms && settings.cachedPlatforms.length && platform) {
            const tempPlatform = settings.cachedPlatforms[0].elements.options.linkedItems.filter(elem => platform === elem.elements.platform.value[0].codename);
            if (tempPlatform.length) {
                queryString += tempPlatform[0].elements.url.value;
            }
        }

        settings.urlMap.push(getMapItem({
            id: settings.item.system.id,
            codename: `${settings.item.system.codename}|${platform}`,
            url: `/learn/${settings.url.join('/')}/${queryString}`,
            type: settings.item.system.type,
            date: settings.item.system.lastModified,
            visibility: settings.item.elements.visibility && settings.item.elements.visibility.value.length ? settings.item.elements.visibility.value : null
        }));
    }

    return settings.urlMap;
};

const handleNodes = (settings) => {
    const item = settings.item;
    if (item.system.workflowStep === 'archived' || item.system.type === 'navigation_link') {
        return settings.urlMap;
    }

    if (item.elements.url) {
        settings.url.push(item.elements.url.value);
    }

    if (!(item.elements.children && settings.isSitemap)) {
        settings.urlMap.push(getMapItem({
            id: item.system.id,
            codename: item.system.codename,
            url: `/learn/${settings.url.join('/')}${settings.url.length ? '/' : ''}`,
            type: item.system.type,
            date: item.system.lastModified,
            visibility: item.elements.visibility && item.elements.visibility.value.length ? item.elements.visibility.value : null
        }));
    }

    if (item.elements.subpages) {
        for (let i = 0; i < item.elements.subpages.linkedItems.length; i++) {
            settings.item = item.elements.subpages.linkedItems[i];
            handleNodes(settings);
        }
    } else if (item.elements.children) {
        for (let i = 0; i < item.elements.children.linkedItems.length; i++) {
            settings.item = item.elements.children.linkedItems[i];
            handleMultihandlePlatformArticles(settings);
        }
    } else if (item.elements.platform && item.elements.platform.value.length) {
        handlePlatformArticle(settings);
    } else {
        if (item.elements.categories && item.elements.categories.linkedItems.length && !settings.isSitemap) {
            for (let i = 0; i < item.elements.categories.linkedItems.length; i++) {
                settings.item = item.elements.categories.linkedItems[i];
                handleReferenceHash(settings);
            }
        }
        if (item.elements.security && item.elements.security.linkedItems.length && !settings.isSitemap) {
            for (let i = 0; i < item.elements.security.linkedItems.length; i++) {
                settings.item = item.elements.security.linkedItems[i];
                handleReferenceHash(settings);
            }
        }
    }

    settings.url.length = settings.url.length > 0 ? settings.url.length - 1 : 0;

    return settings.urlMap;
};

const queryDeliveryType = async(type, depth, deliveryClient) => {
    let error;
    const query = deliveryClient.items()
        .type(type)
        .depthParameter(depth);

    let items = await query
        .toPromise()
        .catch(err => {
            error = err;
        });

    const temps = [0];
    for await (let temp of temps) {
        if ((!error && ((items && items.hasStaleContent) || !items)) || error) {
            error = null;
            await sleep(5000);
            items = await query
                .toPromise()
                .catch(err => {
                    error = err;
                });

            if (temp < 5) {
                temps.push(++temp);
            }
        }
    }

    items.items = removeLinkedItemsSelfReferences(items.data.items);

    return {
        items: items,
        error: error
    };
};

const handleUnusedItems = async (type, deliveryClient, urlMap) => {
    const { items, error } = await queryDeliveryType(type, 1, deliveryClient);

    if (items && items.items) {
        items.items.forEach((item) => {
            let isInUrlMap = false;
            urlMap.forEach((mapItem) => {
                if (item.system.codename === mapItem.codename) {
                    isInUrlMap = true;
                }
            });

            if (!isInUrlMap && item.system.workflowStep !== 'archived') {
                urlMap.push(getMapItem({
                    id: item.system.id,
                    codename: item.system.codename,
                    url: `/learn/other/${item.elements.url.value}/`,
                    date: item.system.lastModified,
                    visibility: item.elements.visibility && item.elements.visibility.value.length ? item.elements.visibility.value : null,
                    type: type
                }, fields));
            }
        });
    }

    if (error) {
        errorAppInsights.log('DELIVERY_API_ERROR', items);
    }

    return urlMap;
};

const handleContentType = async (deliveryClient, urlMap, codename, pathSegment, exclude) => {
    const { items, error } = await queryDeliveryType(codename, 1, deliveryClient);

    if (items && items.items) {
        items.items.forEach((item) => {
            if (!item.system.workflowStep !== 'archived') {
                urlMap.push(getMapItem({
                    id: item.system.id,
                    codename: item.system.codename,
                    url: `/learn/${pathSegment}/${item.elements.url.value}/`,
                    date: item.system.lastModified,
                    visibility: exclude ? [{ codename: 'excluded_from_search' }] : null,
                    type: item.system.type
                }, fields));
            }
        });
    }

    if (error) {
        errorAppInsights.log('DELIVERY_API_ERROR', items);
    }

    return urlMap;
};

const handleLandingPage = async (deliveryClient, urlMap, codenames) => {
    const lpItems = [];
    const trainingItems = [];
    for (let i = 0; i < urlMap.length; i++) {
        if (urlMap[i].type === 'landing_page') {
            lpItems.push(urlMap[i]);
        }
    }

    for await (const codename of codenames) {
        const { items, error } = await queryDeliveryType(codename, 1, deliveryClient);
        if (items && items.items) {
            trainingItems.push(...items.items);
        }

        if (error) {
            errorAppInsights.log('DELIVERY_API_ERROR', items);
        }
    }

    for (let i = 0; i < lpItems.length; i++) {
        for (let j = 0; j < trainingItems.length; j++) {
            if (!trainingItems[j].system.workflowStep !== 'archived') {
                urlMap.push(getMapItem({
                    id: trainingItems[j].system.id,
                    codename: trainingItems[j].system.codename,
                    url: `${lpItems[i].url}${trainingItems[j].elements.url.value}/`,
                    date: trainingItems[j].system.lastModified,
                    visibility: null,
                    type: trainingItems[j].system.type
                }, fields));
            }
        }
    }

    return urlMap;
};

const getUrlMap = async (res, isSitemap) => {
    deliveryConfig.projectId = res.locals.projectid;

    if (res.locals.previewapikey) {
        deliveryConfig.previewApiKey = res.locals.previewapikey;
        deliveryConfig.enablePreviewMode = true;
    }

    if (res.locals.securedapikey) {
        deliveryConfig.secureApiKey = res.locals.securedapikey;
        deliveryConfig.defaultQueryConfig = {};
        deliveryConfig.defaultQueryConfig.useSecuredMode = true;
    }

    const cachedPlatforms = await getPlatforms(res);
    const deliveryClient = KontentDelivery.createDeliveryClient(deliveryConfig);

    const { items, error } = await queryDeliveryType('homepage', 5, deliveryClient);

    if (isSitemap) {
        fields = ['codename', 'url', 'date', 'visibility', 'type'];
    } else {
        isSitemap = false;
        fields = ['id', 'codename', 'url', 'type'];
    }

    if (error) {
        errorAppInsights.log('DELIVERY_API_ERROR', items);
    }

    let urlMap = handleNodes({
        item: items.items[0],
        isSitemap: isSitemap,
        url: [],
        urlMap: [],
        cachedPlatforms: cachedPlatforms
    });
    urlMap = await handleLandingPage(deliveryClient, urlMap, ['training_certification_test', 'training_course2']);
    urlMap = await handleUnusedItems('article', deliveryClient, urlMap);
    urlMap = await handleUnusedItems('training_course2', deliveryClient, urlMap);
    urlMap = await handleContentType(deliveryClient, urlMap, 'training_certification_test', 'get-certified', true);

    return urlMap;
};

module.exports = getUrlMap;
