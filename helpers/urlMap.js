const {
    DeliveryClient
} = require('@kentico/kontent-delivery');
const {
    deliveryConfig
} = require('../config');
const app = require('../app');
const requestDelivery = require('./requestDelivery');
const helper = require('./helperFunctions');
const ensureSingle = require('./ensureSingle');
let fields = ['codename', 'url'];

const getMapItem = (data) => {
    const item = {};
    fields.forEach(field => {
        switch (field) {
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

    if (settings.cachedPlatforms && settings.cachedPlatforms.length && settings.item.platform && settings.item.platform.value.length) {
        const tempPlatform = settings.cachedPlatforms[0].options.value.filter(elem => settings.item.platform.value[0].codename === elem.platform.value[0].codename);
        if (tempPlatform.length) {
            queryString += tempPlatform[0].url.value;
        }
    }

    settings.urlMap.push(getMapItem({
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
        hash = `#tag/${helper.replaceWhitespaceWithDash(settings.item.name.value)}`;
    } else if (settings.item.system.type === 'zapi_path_operation') {
        hash = `#operation/${settings.item.url.value}`;
    } else if (settings.item.system.type === 'zapi_security_scheme') {
        hash = '#section/Authentication';
    }

    settings.urlMap.push(getMapItem({
        codename: settings.item.system.codename,
        url: `/learn/${settings.url.join('/')}/${hash}`,
        type: settings.item.system.type,
        date: settings.item.system.lastModified,
        visibility: settings.item.visibility && settings.item.visibility.value.length ? settings.item.visibility.value : null
    }));

    if (settings.item.path_operations && settings.item.path_operations.value.length) {
        const elem = settings.item.path_operations.value;
        for (let i = 0; i < elem.length; i++) {
            settings.item = elem[i];
            handleReferenceHash(settings);
        }
    }

    return settings.urlMap;
};

const handlePlatformArticle = (settings) => {
    for (let i = 0; i < settings.item.platform.value.length; i++) {
        const platform = settings.item.platform.value[i].codename;
        let queryString = '?tech=';

        if (settings.cachedPlatforms && settings.cachedPlatforms.length && platform) {
            const tempPlatform = settings.cachedPlatforms[0].options.value.filter(elem => platform === elem.platform.value[0].codename);
            if (tempPlatform.length) {
                queryString += tempPlatform[0].url.value;
            }
        }

        settings.urlMap.push(getMapItem({
            codename: `${settings.item.system.codename}|${platform}`,
            url: `/learn/${settings.url.join('/')}/${queryString}`,
            type: settings.item.system.type,
            date: settings.item.system.lastModified,
            visibility: settings.item.visibility && settings.item.visibility.value.length ? settings.item.visibility.value : null
        }));
    }

    return settings.urlMap;
};

const handleNodes = (settings) => {
    const item = settings.item;
    if (item._raw.system.workflow_step === 'archived' || item.system.type === 'navigation_link') {
        return settings.urlMap;
    }

    if (item.url) {
        settings.url.push(item.url.value);
    }

    if (!(item.children && settings.isSitemap)) {
        settings.urlMap.push(getMapItem({
            codename: item.system.codename,
            url: `/learn/${settings.url.join('/')}${settings.url.length ? '/' : ''}`,
            type: item.system.type,
            date: item.system.lastModified,
            visibility: item.visibility && item.visibility.value.length ? item.visibility.value : null
        }));
    }

    if (item.subpages) {
        for (let i = 0; i < item.subpages.value.length; i++) {
            settings.item = item.subpages.value[i];
            handleNodes(settings);
        }
    } else if (item.children) {
        for (let i = 0; i < item.children.value.length; i++) {
            settings.item = item.children.value[i];
            handleMultihandlePlatformArticles(settings);
        }
    } else if (item.platform && item.platform.value.length) {
        handlePlatformArticle(settings);
    } else {
        if (item.categories && item.categories.value.length && !settings.isSitemap) {
            for (let i = 0; i < item.categories.value.length; i++) {
                settings.item = item.categories.value[i];
                handleReferenceHash(settings);
            }
        }
        if (item.security && item.security.value.length && !settings.isSitemap) {
            for (let i = 0; i < item.security.value.length; i++) {
                settings.item = item.security.value[i];
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
            await helper.sleep(5000);
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

    items.items = helper.removeLinkedItemsSelfReferences(items.items);

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

            if (!isInUrlMap && item._raw.system.workflow_step !== 'archived') {
                urlMap.push(getMapItem({
                    codename: item.system.codename,
                    url: `/learn/other/${item.system.codename}/`,
                    date: item.system.lastModified,
                    visibility: item.visibility && item.visibility.value.length ? item.visibility.value : null,
                    type: type
                }, fields));
            }
        });
    }

    if (error && app.appInsights) {
        app.appInsights.defaultClient.trackTrace({ message: 'DELIVERY_API_ERROR: ' + error.message });
    }

    return urlMap;
};

const handleContentType = async (deliveryClient, urlMap, codename, pathSegment) => {
    const { items, error } = await queryDeliveryType(codename, 1, deliveryClient);

    if (items && items.items) {
        items.items.forEach((item) => {
            if (!item._raw.system.workflow_step !== 'archived') {
                urlMap.push(getMapItem({
                    codename: item.system.codename,
                    url: `/learn/${pathSegment}/${item.url.value}/`,
                    date: item.system.lastModified,
                    visibility: [{ codename: 'excluded_from_search' }],
                    type: item.system.type
                }, fields));
            }
        });
    }

    if (error && app.appInsights) {
        app.appInsights.defaultClient.trackTrace({ message: 'DELIVERY_API_ERROR: ' + error.message });
    }

    return urlMap;
};

const getUrlMap = async (res, isSitemap) => {
    deliveryConfig.projectId = res.locals.projectid;
    deliveryConfig.retryAttempts = 0;

    if (res.locals.previewapikey) {
        deliveryConfig.previewApiKey = res.locals.previewapikey;
        deliveryConfig.enablePreviewMode = true;
    }

    if (res.locals.securedapikey) {
        deliveryConfig.secureApiKey = res.locals.securedapikey;
        deliveryConfig.globalQueryConfig = {};
        deliveryConfig.globalQueryConfig.useSecuredMode = true;
    }

    const cachedPlatforms = await getPlatforms(res);
    const deliveryClient = new DeliveryClient(deliveryConfig);

    const { items, error } = await queryDeliveryType('homepage', 5, deliveryClient);

    if (isSitemap) {
        fields = ['codename', 'url', 'date', 'visibility', 'type'];
    } else {
        isSitemap = false;
        fields = ['codename', 'url', 'type'];
    }

    if (error && app.appInsights) {
        app.appInsights.defaultClient.trackTrace({ message: 'DELIVERY_API_ERROR: ' + error.message });
    }

    let urlMap = handleNodes({
        item: items.items[0],
        isSitemap: isSitemap,
        url: [],
        urlMap: [],
        cachedPlatforms: cachedPlatforms
    });
    urlMap = await handleUnusedItems('article', deliveryClient, urlMap);
    urlMap = await handleUnusedItems('training_course2', deliveryClient, urlMap);
    urlMap = await handleContentType(deliveryClient, urlMap, 'training_survey', 'survey');
    urlMap = await handleContentType(deliveryClient, urlMap, 'training_certification_test', 'get-certified');

    return urlMap;
};

module.exports = getUrlMap;
