const cache = require('memory-cache');
const commonContent = require('./commonContent');
const app = require('../app');
const requestDelivery = require('./requestDelivery');
const getRootCodenamesOfSingleItem = require('./rootItemsGetter');
const handleCache = require('./handleCache');
const getUrlMap = require('./urlMap');
const isPreview = require('./isPreview');
const helper = require('./helperFunctions');
const fastly = require('./fastly');

const requestItemAndDeleteCacheKey = async (codename, KCDetails, res) => {
    const originalItem = handleCache.getCache(codename, KCDetails);

    if (originalItem && originalItem.length) {
        if (originalItem[0].redirect_urls) {
            await fastly.purgeToRedirectUrls(originalItem[0].redirect_urls, res);
        }

        handleCache.deleteCache(codename, KCDetails);
    }

    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });
    const newItem = await requestDelivery({
        codename: codename,
        depth: 2,
        resolveRichText: true,
        urlMap: urlMap,
        ...KCDetails
    });

    if (newItem && newItem.length) {
        handleCache.putCache(codename, newItem, KCDetails);

        if (newItem[0].redirect_urls) {
            await fastly.purgeToRedirectUrls(newItem[0].redirect_urls, res);
        }
    }

    await fastly.purge(codename, res);
};

const deleteSpecificKeys = async (KCDetails, items, res) => {
    for await (const item of items) {
        await requestItemAndDeleteCacheKey(item.codename, KCDetails, res);
    }
};

const revalidateReleaseNoteType = async (KCDetails, res) => {
    const key = 'releaseNoteContentType';
    handleCache.deleteCache(key, KCDetails);
    const releaseNoteType = await commonContent.getReleaseNoteType(res);
    handleCache.putCache(key, releaseNoteType, KCDetails);
};

const revalidateTrainingCourseType = async (KCDetails, res) => {
    const key = 'trainingCourseContentType';
    handleCache.deleteCache(key, KCDetails);
    const trainingCourseType = await commonContent.getTrainingCourseType(res);
    handleCache.putCache(key, trainingCourseType, KCDetails);
};

const splitPayloadByContentType = (items) => {
    const itemsByTypes = {
        home: [],
        footer: [],
        UIMessages: [],
        articles: [],
        scenarios: [],
        topics: [],
        notFound: [],
        picker: [],
        navigationItems: [],
        apiSpecifications: [],
        redirectRules: [],
        releaseNotes: [],
        termDefinitions: [],
        trainingCourses: []
    };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type === 'home' || item.type === 'navigation_item' || item.type === 'navigation_link') {
            itemsByTypes.home.push(item);
        } else if (item.type === 'footer') {
            itemsByTypes.footer.push(item);
        } else if (item.type === 'ui_messages') {
            itemsByTypes.UIMessages.push(item);
        } else if (item.type === 'article') {
            itemsByTypes.articles.push(item);
        } else if (item.type === 'scenario') {
            itemsByTypes.scenarios.push(item);
        } else if (item.type === 'topic') {
            itemsByTypes.topics.push(item);
        } else if (item.type === 'not_found') {
            itemsByTypes.notFound.push(item);
        } else if (item.type === 'platform_picker' || item.type === 'platform_option') {
            itemsByTypes.picker.push(item);
        } else if (item.type === 'navigation_item') {
            itemsByTypes.navigationItems.push(item);
        } else if (item.type === 'multiplatform_article') {
            itemsByTypes.articles.push(item);
            itemsByTypes.scenarios.push(item);
        } else if (item.type === 'zapi_specification') {
            itemsByTypes.apiSpecifications.push(item);
        } else if (item.type === 'redirect_rule') {
            itemsByTypes.redirectRules.push(item);
        } else if (item.type === 'release_note') {
            itemsByTypes.releaseNotes.push(item);
        } else if (item.type === 'term_definition') {
            itemsByTypes.termDefinitions.push(item);
        } else if (item.type === 'training_course') {
            itemsByTypes.trainingCourses.push(item);
        }
    }

    return itemsByTypes;
};

const getRootItems = async (items, KCDetails) => {
    const typesToSearch = ['article', 'scenario', 'callout', 'content_chunk', 'code_sample', 'code_samples'];
    const allItems = await requestDelivery({
        types: typesToSearch,
        depth: 0,
        ...KCDetails
    });

    const rootCodenames = new Set();
    if (items && allItems) {
        items.forEach((item) => {
            const roots = getRootCodenamesOfSingleItem(item, allItems);
            roots.forEach(codename => rootCodenames.add(codename));
        });
    }

    return rootCodenames;
};

const invalidateRootItems = async (items, KCDetails, res) => {
    const rootItems = Array.from(await getRootItems(items, KCDetails));

    for await (const rootItem of rootItems) {
        await requestItemAndDeleteCacheKey(rootItem, KCDetails, res);
    }
};

const invalidateGeneral = async (itemsByTypes, KCDetails, res, type, keyName) => {
    if (!keyName) {
        keyName = type;
    }

    if (itemsByTypes[type].length || itemsByTypes.home.length) {
        handleCache.deleteCache(keyName, KCDetails);
        await handleCache.evaluateCommon(res, [keyName]);
    }

    return false;
};

const invalidateMultiple = async (itemsByTypes, KCDetails, type, res) => {
    if (itemsByTypes[type].length) {
        itemsByTypes[type].forEach(async (item) => {
            await requestItemAndDeleteCacheKey(item.codename, KCDetails, res);
        });
    }

    return false;
};

const invalidateArticles = async (itemsByTypes, KCDetails, res) => {
    if (itemsByTypes.home.length) {
        const articles = handleCache.getCache('articles', KCDetails);
        for (let i = 0; i < articles.length; i++) {
            itemsByTypes.articles.push({ codename: articles[i].system.codename })
        }
    }

    if (itemsByTypes.articles.length) {
        await revalidateReleaseNoteType(KCDetails, res);
        await revalidateTrainingCourseType(KCDetails, res);
        await deleteSpecificKeys(KCDetails, itemsByTypes.articles, res);
        handleCache.deleteCache('articles', KCDetails);
        await handleCache.evaluateCommon(res, ['articles']);
    }

    return false;
};

const invalidateScenarios = async (itemsByTypes, KCDetails, res) => {
    if (itemsByTypes.home.length) {
        const scenarios = handleCache.getCache('scenarios', KCDetails);
        for (let i = 0; i < scenarios.length; i++) {
            itemsByTypes.scenarios.push({ codename: scenarios[i].system.codename })
        }
    }

    if (itemsByTypes.scenarios.length) {
        await deleteSpecificKeys(KCDetails, itemsByTypes.scenarios, res);
        handleCache.deleteCache('scenarios', KCDetails);
        await handleCache.evaluateCommon(res, ['scenarios']);
    }

    return false;
};

const invalidateAPISpecifications = async (itemsByTypes, KCDetails, res) => {
    if (itemsByTypes.apiSpecifications.length) {
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'apiSpecifications');
        await deleteSpecificKeys(KCDetails, itemsByTypes.apiSpecifications, res);
    }

    if (itemsByTypes.home.length) {
        await handleCache.cacheAllAPIReferences(res, true);
    }
};

const invalidateHome = async (res, KCDetails) => {
    handleCache.deleteCache('home', KCDetails);
    await handleCache.evaluateCommon(res, ['home']);
};

const invalidateUrlMap = async (res, KCDetails) => {
    handleCache.deleteCache('urlMap', KCDetails);
    if (!isPreview(res.locals.previewapikey)) {
        await fastly.axiosPurge(`${helper.getDomain()}/urlmap`);
    }
    await handleCache.evaluateCommon(res, ['urlMap']);
};

const invalidateSubNavigation = async (res, keys, KCDetails) => {
    let subNavigationKeys = keys.filter(key => key.startsWith('subNavigation_'));
    subNavigationKeys = subNavigationKeys.map(key => {
        return key.replace('subNavigation_', '').replace(`_${KCDetails.projectid}`, '');
    });
    handleCache.deleteMultipleKeys('subNavigation_', keys);
    for await (const codename of subNavigationKeys) {
        await handleCache.evaluateSingle(res, `subNavigation_${codename}`, async () => {
            return await commonContent.getSubNavigation(res, codename);
        });
    }
};

const invalidateElearning = async (itemsByTypes, KCDetails, res) => {
    if (itemsByTypes.trainingCourses.length) {
        await invalidateMultiple(itemsByTypes, KCDetails, 'trainingCourses', res);
        await revalidateTrainingCourseType(KCDetails, res);
        await requestItemAndDeleteCacheKey('e_learning_overview', KCDetails, res);
    }
};

const processInvalidation = async (req, res) => {
    const items = cache.get('webhook-payload-pool') || [];
    if (items.length) {
        const KCDetails = commonContent.getKCDetails(res);
        const keys = cache.keys();
        const itemsByTypes = splitPayloadByContentType(items);
        await fastly.purgeInitial(itemsByTypes, items, res);
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'picker', 'platformsConfig');
        await invalidateUrlMap(res, KCDetails);
        await invalidateHome(res, KCDetails);
        await invalidateRootItems(items, KCDetails, res);
        await invalidateAPISpecifications(itemsByTypes, KCDetails, res);
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'footer');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'UIMessages');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'notFound');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'redirectRules');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'releaseNotes');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'termDefinitions');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'navigationItems');
        await invalidateSubNavigation(res, keys, KCDetails);
        await invalidateArticles(itemsByTypes, KCDetails, res);
        await invalidateScenarios(itemsByTypes, KCDetails, res);
        await invalidateMultiple(itemsByTypes, KCDetails, 'topics', res);
        await invalidateElearning(itemsByTypes, KCDetails, res);
        await fastly.purgeFinal(itemsByTypes, req, res);

        if (app.appInsights) {
            app.appInsights.defaultClient.trackTrace({ message: 'URL_MAP_INVALIDATE: ' + items });
        }
    }
};

module.exports = processInvalidation;
