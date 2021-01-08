const cache = require('memory-cache');
const commonContent = require('../helpers/commonContent');
const app = require('../app');
const requestDelivery = require('../helpers/requestDelivery');
const getRootCodenamesOfSingleItem = require('../helpers/rootItemsGetter');
const handleCache = require('../helpers/handleCache');
const getUrlMap = require('../helpers/urlMap');
const isPreview = require('../helpers/isPreview');
const helper = require('../helpers/helperFunctions');

const requestItemAndDeleteCacheKey = async (codename, KCDetails, res) => {
    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });
    const item = await requestDelivery({
        codename: codename,
        depth: 2,
        resolveRichText: true,
        urlMap: urlMap,
        ...KCDetails
    });

    if (item && item.length) {
        if (handleCache.getCache(codename, KCDetails)) {
            handleCache.deleteCache(codename, KCDetails);
            handleCache.putCache(codename, item, KCDetails);
        }
    }

    await handleCache.sendFastlySoftPurge(codename, res);
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
        if (item.type === 'footer') {
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
        } else if (item.type === 'platform_picker') {
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

    if (itemsByTypes[type].length) {
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
};

const invalidateHome = async (res, KCDetails) => {
    handleCache.deleteCache('home', KCDetails);
    await handleCache.evaluateCommon(res, ['home']);
};

const invalidateUrlMap = async (res, KCDetails) => {
    handleCache.deleteCache('urlMap', KCDetails);
    if (!isPreview(res.locals.previewapikey)) {
        const domain = process.env.baseURL.split('://');
        if (domain[1]) {
            await handleCache.axiosFastlySoftPurge(`${helper.getDomain(domain[0], domain[1])}/urlmap`);
        }
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

const sendPurgeToGeneralPages = async (itemsByTypes, req, res) => {
    if (!isPreview(res.locals.previewapikey)) {
        const domain = process.env.baseURL.split('://');
        if (domain[1]) {
            const axiosDomain = helper.getDomain(domain[0], domain[1]);

            if (itemsByTypes.releaseNotes.length && req.app.locals.changelogPath) {
                await handleCache.axiosFastlySoftPurge(`${axiosDomain}${req.app.locals.changelogPath}`);
            }

            if (itemsByTypes.termDefinitions.length && req.app.locals.terminologyPath) {
                await handleCache.axiosFastlySoftPurge(`${axiosDomain}${req.app.locals.terminologyPath}`);
            }

            if (itemsByTypes.trainingCourses.length && req.app.locals.elearningPath) {
                await handleCache.axiosFastlySoftPurge(`${axiosDomain}${req.app.locals.elearningPath}`);
            }
        }
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
        await invalidateUrlMap(res, KCDetails);
        await invalidateHome(res, KCDetails);
        await invalidateSubNavigation(res, keys, KCDetails);
        await invalidateRootItems(items, KCDetails, res);
        await invalidateAPISpecifications(itemsByTypes, KCDetails, res);
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'footer');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'UIMessages');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'notFound');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'redirectRules');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'releaseNotes');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'termDefinitions');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'picker', 'platformsConfig');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'navigationItems');
        await invalidateArticles(itemsByTypes, KCDetails, res);
        await invalidateScenarios(itemsByTypes, KCDetails, res);
        await invalidateMultiple(itemsByTypes, KCDetails, 'topics', res);
        await invalidateElearning(itemsByTypes, KCDetails, res);
        await sendPurgeToGeneralPages(itemsByTypes, req, res);

        if (app.appInsights) {
            app.appInsights.defaultClient.trackTrace({ message: 'URL_MAP_INVALIDATE: ' + items });
        }
    }
};

module.exports = processInvalidation;
