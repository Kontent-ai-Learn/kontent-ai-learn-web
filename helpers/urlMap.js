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

// Define length of url for specific content types (number of path elements)
const typeLevels = {
    home: {
        urlLength: 0
    },
    navigation_item: {
        urlLength: 1
    },
    scenario: {
        urlLength: 2
    },
    zapi_specification: {
        urlLength: 2
    },
    zapi__category: {
        urlLength: 3
    },
    zapi_path_operation: {
        urlLength: 3
    },
    zapi_security_scheme: {
        urlLength: 3
    },
    topic: {
        urlLength: 3
    },
    article: {
        urlLength: [2, 4]
    },
    multiplatform_article: {
        urlLength: [2, 4]
    }
};

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

const redefineTypeLevelArticle = (response, urlLength) => {
    let level = [2, 4];

    if (response.system && response.system.type === 'multiplatform_article') {
        if (urlLength === 4) {
            level = [2, 5];
        } else if (urlLength === 2) {
            level = [3, 4];
        }
    }

    return level;
};

const handleLangForMultiplatformArticle = async (queryString, item, res) => {
    queryString = '?tech=';
    const cachedPlatforms = await ensureSingle(res, 'platformsConfig', async () => {
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
    if (cachedPlatforms && cachedPlatforms.length && item.platform && item.platform.value.length) {
        const tempPlatform = cachedPlatforms[0].options.value.filter(elem => item.platform.value[0].codename === elem.platform.value[0].codename);
        if (tempPlatform.length) {
            queryString += tempPlatform[0].url.value;
        }
    }

    return queryString;
};

const addItemToMap = (settings) => {
    // Do not place multiplatform articles (urls without tech qs) in sitemap
    if (!(settings.type === 'multiplatform_article' && settings.isSitemap)) {
        settings.urlMap.push(getMapItem({
            codename: settings.item.system.codename,
            url: `/${settings.url.join('/')}${settings.queryString}${settings.hash}`,
            date: settings.item.system.lastModified,
            visibility: settings.item.visibility && settings.item.visibility.value.length ? settings.item.visibility.value : null,
            type: settings.type
        }, fields));
    }

    return settings.urlMap;
};

const getTypeLevel = (typeLength, urlLength) => {
    let typeLevel = 0;

    if (Array.isArray(typeLength)) {
        for (let i = 0; i < typeLength.length; i++) {
            if (typeLength[i] >= urlLength) {
                typeLevel = typeLength[i];
                break;
            }
        }
    } else {
        typeLevel = typeLength;
    }

    return typeLevel;
};

const createUrlMap = async (response, isSitemap, url, urlMap = [], res) => {
    const nodes = [];
    const queryString = '';
    const hash = '';

    if (response) {
        if (response.items) nodes.push('items');
        if (response.navigation) nodes.push('navigation');
        if (response.children) nodes.push('children');
        if (response.topics) nodes.push('topics');

        if (!isSitemap) {
            if (response.categories) nodes.push('categories');
            if (response.path_operations) nodes.push('path_operations');
            if (response.security) nodes.push('security');
        }

        for (let i = 0; i < nodes.length; i++) {
            if (response[nodes[i]]) {
                const items = response[nodes[i]].value || response[nodes[i]];

                for await (const item of items) {
                    urlMap = await handleNode({
                        response,
                        item,
                        urlMap,
                        url,
                        queryString,
                        hash,
                        isSitemap,
                        res
                    });
                };
            }
        }
    }

    return urlMap;
};

const handleNode = async (settings) => {
    if (settings.response.system && settings.item.system &&
            (settings.response.system.type === 'navigation_item' && (settings.item.system.type === 'multiplatform_article' || settings.item.system.type === 'article'))
       ) {
        settings.url.length = 2;
    }

    typeLevels.article.urlLength = redefineTypeLevelArticle(settings.response, settings.url.length);

    if ((settings.item.url || settings.item.system.type === 'zapi_security_scheme') && typeLevels[settings.item.system.type]) {
        const typeLevel = getTypeLevel(typeLevels[settings.item.system.type].urlLength, settings.url.length);

        settings.url.length = typeLevel;
        let slug = '';

        if (settings.response.system && settings.item.system && settings.response.system.type === 'multiplatform_article' && settings.item.system.type === 'article') {
            // Handle "lang" query string in case articles are assigned to "multiplatform_article"
            settings.queryString = await handleLangForMultiplatformArticle(settings.queryString, settings.item, settings.res);
            /* }  else if (settings.item.system && settings.item.system.type === 'article' && globalConfig.isSitemap) {
                // Handle "lang" query string in case "article" has values selected in the "Platform" field
                let tempProperties = handleLangForPlatformField({ item: settings.item, slug, url: settings.url, urlMap: settings.urlMap });
                settings.urlMap = tempProperties.urlMap;
                slug = tempProperties.slug;
                settings.url = tempProperties.url; */
        } else if (settings.item.system.type === 'zapi__category') {
            settings.hash = `#tag/${helper.replaceWhitespaceWithDash(settings.item.name.value)}`;
        } else if (settings.item.system.type === 'zapi_path_operation') {
            settings.hash = `#operation/${settings.item.url.value}`;
        } else if (settings.item.system.type === 'zapi_security_scheme') {
            settings.hash = '#section/Authentication';
        } else {
            slug = settings.item.url.value;
        }

        if (slug) {
            settings.url[settings.url.length - 1] = slug;
        } else {
            settings.url.length = settings.url.length - 1;
        }
    }

    // Add url to map
    if (typeLevels[settings.item.system.type]) {
        settings.urlMap = addItemToMap({
            urlMap: settings.urlMap,
            item: settings.item,
            url: settings.url,
            queryString: settings.queryString,
            hash: settings.hash,
            type: settings.item.system.type,
            isSitemap: settings.isSitemap
        });
    }

    settings.queryString = '';
    settings.hash = '';

    return await createUrlMap(settings.item, settings.isSitemap, settings.url, settings.urlMap, settings.res);
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
    return {
        items: items,
        error: error
    };
}

const addUnusedArtilesToUrlMap = async (deliveryClient, urlMap) => {
    const { items, error } = await queryDeliveryType('article', 1, deliveryClient);

    if (items && items.items) {
        items.items.forEach((articleItem) => {
            let isInUrlMap = false;
            urlMap.forEach((mapItem) => {
                if (articleItem.system.codename === mapItem.codename) {
                    isInUrlMap = true;
                }
            });

            if (!isInUrlMap) {
                urlMap.push(getMapItem({
                    codename: articleItem.system.codename,
                    url: `/other/${articleItem.url.value}`,
                    date: articleItem.system.lastModified,
                    visibility: articleItem.visibility && articleItem.visibility.value.length ? articleItem.visibility.value : null,
                    type: 'article'
                }, fields));
            }
        });
    }

    if (error && app.appInsights) {
        app.appInsights.defaultClient.trackTrace({ message: 'DELIVERY_API_ERROR: ' + error.message });
    }

    return urlMap;
};

const addTrainingCoursesToUrlMap = async(deliveryClient, urlMap) => {
    const eLearningItem = urlMap.filter(item => item.codename === 'e_learning');
    const eLearningItemUrl = eLearningItem.length ? eLearningItem[0].url : null;
    if (!eLearningItemUrl) return urlMap;

    const { items, error } = await queryDeliveryType('training_course', 1, deliveryClient);

    items.items.forEach((courseItem) => {
        urlMap.push(getMapItem({
            codename: courseItem.system.codename,
            url: `${eLearningItemUrl}/${courseItem.url.value}`,
            date: courseItem.system.lastModified,
            visibility: courseItem.visibility && courseItem.visibility.value.length ? courseItem.visibility.value : null,
            type: courseItem.system.type
        }, fields));
    });

    if (error && app.appInsights) {
        app.appInsights.defaultClient.trackTrace({ message: 'DELIVERY_API_ERROR: ' + error.message });
    }

    return urlMap;
};

const getUrlMap = async (res, isSitemap) => {
    // globalConfig = config;
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

    const deliveryClient = new DeliveryClient(deliveryConfig);

    const { items, error } = await queryDeliveryType('home', 5, deliveryClient);

    if (isSitemap) {
        fields = ['codename', 'url', 'date', 'visibility', 'type'];
    } else {
        isSitemap = false;
        fields = ['codename', 'url', 'type'];
    }

    if (error && app.appInsights) {
        app.appInsights.defaultClient.trackTrace({ message: 'DELIVERY_API_ERROR: ' + error.message });
    }

    let urlMap = await createUrlMap(items, isSitemap, [], [], res);
    urlMap = await addUnusedArtilesToUrlMap(deliveryClient, urlMap);
    urlMap = await addTrainingCoursesToUrlMap(deliveryClient, urlMap);
    return urlMap;
};

module.exports = getUrlMap;
