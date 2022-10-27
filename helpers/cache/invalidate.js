const cache = require('memory-cache');
const fs = require('fs');
const getContent = require('../kontent/getContent');
const requestDelivery = require('../kontent/requestDelivery');
const getRootCodenamesOfSingleItem = require('./rootItemsGetter');
const cacheHandle = require('../cache/handle');
const isPreview = require('../kontent/isPreview');
const { getLogItemCacheKey, removeLogItemCacheKey, getDomain } = require('../general/helper');
const fastly = require('../services/fastly');
const getUrlMap = require('../general/urlMap');

const requestItemAndDeleteCacheKey = async (codename, type, KCDetails, res) => {
    const originalItem = cacheHandle.get(codename, KCDetails);

    if (originalItem && originalItem.length) {
        if (originalItem[0].redirect_urls) {
            await fastly.purgeToRedirectUrls(originalItem[0].redirect_urls, res);
        }

        cacheHandle.remove(codename, KCDetails);
    }

    const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });
    const options = {
        codename: codename,
        depth: 4,
        resolveRichText: true,
        urlMap: urlMap,
        ...KCDetails
    };
    if (!type) {
        const urlMapItem = urlMap.find(item => item.codename === codename);
        if (urlMapItem) type = urlMapItem.type;
    }
    if (type) {
        options.type = type;
    }
    let newItem = await requestDelivery(options);

    if (newItem && (newItem?.items?.length || newItem?.length)) {
        cacheHandle.put(codename, newItem, KCDetails);

        if (newItem.items) {
            newItem = newItem.items;
        }

        if (newItem[0].redirect_urls) {
            await fastly.purgeToRedirectUrls(newItem[0].redirect_urls, res);
        }
    }

    await fastly.purge(codename, res);
};

const deleteSpecificKeys = async (KCDetails, items, res) => {
    for await (const item of items) {
        await requestItemAndDeleteCacheKey(item.codename, item.type, KCDetails, res);
    }
};

const revalidateReleaseNoteType = async (KCDetails, res) => {
    const key = 'releaseNoteContentType';
    cacheHandle.remove(key, KCDetails);
    const releaseNoteType = await getContent.releaseNoteType(res);
    cacheHandle.put(key, releaseNoteType, KCDetails);
};

const revalidateTaxonomyGroup = async (KCDetails, keyMethod, res) => {
    cacheHandle.remove(keyMethod, KCDetails);
    const taxonomyGroup = await getContent[keyMethod](res);
    cacheHandle.put(keyMethod, taxonomyGroup, KCDetails);
};

const splitPayloadByContentType = (items) => {
    const itemsByTypes = {
        home: [],
        footer: [],
        UIMessages: [],
        articles: [],
        notFound: [],
        picker: [],
        navigationItems: [],
        apiSpecifications: [],
        redirectRules: [],
        releaseNotes: [],
        termDefinitions: [],
        trainingCourses: [],
        landingPages: [],
        trainingUsers: [],
        trainingSubscriptions: [],
        trainingSurveys: [],
        trainingCertificationTests: [],
        emailNotifications: []
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
        } else if (item.type === 'not_found') {
            itemsByTypes.notFound.push(item);
        } else if (item.type === 'platform_picker' || item.type === 'platform_option') {
            itemsByTypes.picker.push(item);
        } else if (item.type === 'navigation_item') {
            itemsByTypes.navigationItems.push(item);
        } else if (item.type === 'multiplatform_article') {
            itemsByTypes.articles.push(item);
        } else if (item.type === 'zapi_specification') {
            itemsByTypes.apiSpecifications.push(item);
        } else if (item.type === 'redirect_rule') {
            itemsByTypes.redirectRules.push(item);
        } else if (item.type === 'release_note') {
            itemsByTypes.releaseNotes.push(item);
        } else if (item.type === 'term_definition') {
            itemsByTypes.termDefinitions.push(item);
        } else if (item.type === 'training_course2') {
            itemsByTypes.trainingCourses.push(item);
        } else if (item.type === 'landing_page') {
            itemsByTypes.landingPages.push(item);
        } else if (item.type === 'training_user') {
            itemsByTypes.trainingUsers.push(item);
        } else if (item.type === 'training_subscriptions') {
            itemsByTypes.trainingSubscriptions.push(item);
        } else if (item.type === 'training_survey') {
            itemsByTypes.trainingSurveys.push(item);
        } else if (item.type === 'training_certification_test') {
            itemsByTypes.trainingCertificationTests.push(item);
        } else if (item.type === 'email_notification') {
            itemsByTypes.emailNotifications.push(item);
        }
    }

    return itemsByTypes;
};

const invalidatePDFItem = async (codename, res) => {
    const pdfs = getLogItemCacheKey('api2pdf-cache', 'codename', codename);

    for await (const pdf of pdfs) {
        await fastly.purgePDF(pdf.filename, res);
        fs.unlink(`./public/files/${pdf.filename}.pdf`, (err) => {
            return err;
        });
    }

    removeLogItemCacheKey('api2pdf-cache', 'codename', codename);
};

const invalidatePDFs = async (items, res) => {
    for (let i = 0; i < items.length; i++) {
        await invalidatePDFItem(items[i].codename, res);
    }
};

const getRootItems = async (items, KCDetails) => {
    const typesToSearch = ['article', 'callout', 'content_chunk', 'code_sample', 'code_samples', 'training_survey', 'training_certification_test', 'training_course2', 'training_question_for_survey_and_test', 'training_question_free_text', 'training_answer_for_survey_and_test', 'training_question_group'];
    let allItems = [];

    for await (const type of typesToSearch) {
        let typeItems = await requestDelivery({
            type: type,
            depth: 0,
            ...KCDetails
        });
        if (typeItems?.items) typeItems = typeItems.items;
        allItems = allItems.concat(typeItems);
    }

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
        await invalidatePDFItem(rootItem);
        await requestItemAndDeleteCacheKey(rootItem, null, KCDetails, res);
    }
};

const invalidateGeneral = async (itemsByTypes, KCDetails, res, type, keyName) => {
    if (!keyName) {
        keyName = type;
    }

    if (itemsByTypes[type].length || itemsByTypes.home.length) {
        cacheHandle.remove(keyName, KCDetails);
        await cacheHandle.evaluateCommon(res, [keyName]);
    }

    return false;
};

const invalidateMultiple = async (itemsByTypes, KCDetails, type, res) => {
    if (itemsByTypes[type].length) {
        itemsByTypes[type].forEach(async (item) => {
            await requestItemAndDeleteCacheKey(item.codename, item.type, KCDetails, res);
        });
    }

    return false;
};

const invalidateArticles = async (itemsByTypes, KCDetails, res) => {
    if (itemsByTypes.home.length) {
        const articles = cacheHandle.get('articles', KCDetails);
        for (let i = 0; i < articles.length; i++) {
            itemsByTypes.articles.push({ codename: articles[i].system.codename })
        }
    }

    if (itemsByTypes.articles.length) {
        await revalidateReleaseNoteType(KCDetails, res);
        await revalidateTaxonomyGroup(KCDetails, 'trainingPersonaTaxonomyGroup', res);
        await revalidateTaxonomyGroup(KCDetails, 'trainingTopicTaxonomyGroup', res);
        await deleteSpecificKeys(KCDetails, itemsByTypes.articles, res);
        cacheHandle.remove('articles', KCDetails);
        await cacheHandle.evaluateCommon(res, ['articles']);
    }

    return false;
};

const invalidateReleaseNotes = async (itemsByTypes, KCDetails, res) => {
    await invalidateGeneral(itemsByTypes, KCDetails, res, 'releaseNotes');

    if (itemsByTypes.releaseNotes.length) {
        await revalidateReleaseNoteType(KCDetails, res);
    }
};

const invalidateAPISpecifications = async (itemsByTypes, KCDetails, res) => {
    if (itemsByTypes.apiSpecifications.length) {
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'apiSpecifications');
        await deleteSpecificKeys(KCDetails, itemsByTypes.apiSpecifications, res);
    }

    if (itemsByTypes.home.length) {
        await cacheHandle.apiReferences(res, true);
    }
};

const invalidateHome = async (res, KCDetails) => {
    cacheHandle.remove('home', KCDetails);
    await cacheHandle.evaluateCommon(res, ['home']);
};

const invalidateUrlMap = async (res, KCDetails) => {
    cacheHandle.remove('urlMap', KCDetails);
    if (!isPreview(res.locals.previewapikey)) {
        await fastly.axiosPurge(getDomain(), '/learn/urlmap/');
    }
    await cacheHandle.evaluateCommon(res, ['urlMap']);
};

const invalidateSubNavigation = async (res, keys, KCDetails) => {
    let subNavigationKeys = keys.filter(key => key.startsWith('subNavigation_'));
    subNavigationKeys = subNavigationKeys.map(key => {
        return key.replace('subNavigation_', '').replace(`_${KCDetails.projectid}`, '');
    });
    cacheHandle.deleteMultipleKeys('subNavigation_', keys);
    for await (const codename of subNavigationKeys) {
        await cacheHandle.evaluateSingle(res, `subNavigation_${codename}`, async () => {
            return await getContent.subNavigation(res, codename);
        });
    }
};

const invalidateElearning = async (itemsByTypes, KCDetails, res) => {
    if (itemsByTypes.trainingCourses.length) {
        await invalidateMultiple(itemsByTypes, KCDetails, 'trainingCourses', res);
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'trainingCourses');
        await revalidateTaxonomyGroup(KCDetails, 'trainingPersonaTaxonomyGroup', res);
        await revalidateTaxonomyGroup(KCDetails, 'trainingTopicTaxonomyGroup', res);
    }
};

const invalidate = async (req, res) => {
    const items = cache.get('webhook-payload-pool') || [];
    if (items.length) {
        const KCDetails = getContent.KCDetails(res);
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
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'emailNotifications');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'notFound');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'redirectRules');
        await invalidateReleaseNotes(itemsByTypes, KCDetails, res);
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'termDefinitions');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'navigationItems');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'landingPages');
        await deleteSpecificKeys(KCDetails, itemsByTypes.landingPages, res);
        await invalidateSubNavigation(res, keys, KCDetails);
        await invalidateArticles(itemsByTypes, KCDetails, res);
        await invalidateElearning(itemsByTypes, KCDetails, res);
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'trainingUsers');
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'trainingSubscriptions');
        await deleteSpecificKeys(KCDetails, itemsByTypes.trainingSurveys, res);
        await deleteSpecificKeys(KCDetails, itemsByTypes.trainingCertificationTests, res);
        await invalidateGeneral(itemsByTypes, KCDetails, res, 'trainingCertificationTests');
        await invalidatePDFs(items, res);
        await fastly.purgeFinal(itemsByTypes, req, res);
    }
};

module.exports = {
    invalidate,
    requestItemAndDeleteCacheKey
 };
