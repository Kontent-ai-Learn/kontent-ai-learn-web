const cache = require('memory-cache');
const requestDelivery = require('./requestDelivery');
const ensureSingle = require('../cache/ensureSingle');
const isPreview = require('./isPreview');
const getUrlMap = require('../general/urlMap');

    const KCDetails = (res) => {
        let UIMessages = res.locals.UIMessages
        if (!UIMessages) {
            const UIMessagesCached = cache.get(`UIMessages_${res.locals.projectid}`);
            if (UIMessagesCached && UIMessagesCached.length) {
                UIMessages = UIMessagesCached[0];
            }
        }

        return {
            projectid: res.locals.projectid,
            previewapikey: res.locals.previewapikey,
            securedapikey: res.locals.securedapikey,
            language: res.locals.language,
            host: res.locals.host,
            protocol: res.locals.protocol,
            isPreview: isPreview(res.locals.previewapikey),
            UIMessages: UIMessages,
        };
    };
    const tree = async (contentType, depth, res) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: contentType,
            depth: depth,
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails(res)
        });
    };
    const footer = async (res) => {
        return await requestDelivery({
            type: 'footer',
            ...KCDetails(res)
        });
    };
    const subNavigation = async (res, codename) => {
        return await requestDelivery({
            type: 'navigation_item',
            depth: 4,
            codename: codename,
            ...KCDetails(res)
        });
    };
    const UIMessages = async (res) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'ui_messages',
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails(res)
        });
    };
    const emailNotifications = async (res) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'email_notification',
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails(res)
        });
    };
    const home = async (res) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'homepage',
            depth: 4,
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails(res)
        });
    };
    const articles = async (res) => {
        return await requestDelivery({
            type: ['article', 'multiplatform_article'],
            ...KCDetails(res)
        });
    };
    const trainingSubscriptions = async (res) => {
        return await requestDelivery({
            type: 'training_subscriptions',
            ...KCDetails(res)
        });
    };
    const changelog = async (res) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            codename: 'product_changelog',
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails(res)
        });
    };
    const survey = async (res, codename) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'training_survey',
            codename: codename,
            resolveRichText: true,
            depth: 3,
            urlMap: urlMap,
            ...KCDetails(res)
        });
    };
    const certificationTest = async (res, codename) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'training_certification_test',
            depth: codename ? 4 : 1,
            codename: codename,
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails(res)
        });
    };
    const trainingCourse = async (res) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'training_course2',
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails(res)
        });
    };
    const traniningUser = async (res) => {
        return await requestDelivery({
            type: 'training_user',
            ...KCDetails(res)
        });
    };
    const landingPage = async (res) => {
        return await requestDelivery({
            type: 'landing_page',
            ...KCDetails(res)
        });
    };
    const notFound = async (res) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'not_found',
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails(res)
        });
    };
    const navigationItems = async (res) => {
        return await requestDelivery({
            type: 'navigation_item',
            ...KCDetails(res)
        });
    };
    const references = async (res) => {
        return await requestDelivery({
            type: 'zapi_specification',
            ...KCDetails(res)
        });
    };
    const redirectRules = async (res) => {
        return await requestDelivery({
            type: 'redirect_rule',
            order: {
                field: 'elements.redirect_to',
                type: 'ascending'
            },
            ...KCDetails(res)
        });
    };
    const trainingPersonaTaxonomyGroup = async (res) => {
        return await requestDelivery({
            data: 'taxonomy',
            taxonomy: 'training_persona',
            ...KCDetails(res)
        });
    };
    const trainingTopicTaxonomyGroup = async (res) => {
        return await requestDelivery({
            data: 'taxonomy',
            taxonomy: 'training_topic',
            ...KCDetails(res)
        });
    };
    const releaseNoteType = async (res) => {
        return await requestDelivery({
            data: 'type',
            type: 'release_note',
            ...KCDetails(res)
        });
    };
    const releaseNotes = async (res) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'release_note',
            resolveRichText: true,
            urlMap: urlMap,
            order: {
                field: 'elements.release_date',
                type: 'descending'
            },
            ...KCDetails(res)
        });
    };
    const termDefinitions = async (res) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'term_definition',
            resolveRichText: true,
            urlMap: urlMap,
            order: {
                field: 'elements.term',
            },
            ...KCDetails(res)
        });
    };
    const platformsConfig = async (res) => {
        return await requestDelivery({
            type: 'platform_picker',
            codename: 'platform_picker',
            ...KCDetails(res)
        });
    };
    const platformsConfigPairings = async (res) => {
        const cachedPlatforms = await ensureSingle(res, 'platformsConfig', async () => {
            return await platformsConfig(res);
        });
        const pairings = [];

        if (cachedPlatforms && cachedPlatforms.length) {
            cachedPlatforms[0].options.value.forEach((item) => {
                pairings.push({
                    url: item.url.value,
                    platform: item.platform.value[0].codename,
                    title: item.title.value,
                    icon: item.icon.value[0].url
                });
            });
        }

        return pairings;
    };
    const languages = async (res) => {
        return await requestDelivery({
            data: 'languages',
            ...KCDetails(res)
        });
    };
    const normalizePlatforms = async (platforms, res) => {
        const result = [];
        const order = [];
        let cachedPlatforms = await ensureSingle(res, 'platformsConfig', async () => {
            return await platformsConfig(res);
        });

        if (!cachedPlatforms) {
            cachedPlatforms = await platformsConfig(res);
        }

        if (platforms && cachedPlatforms && cachedPlatforms.length) {
            cachedPlatforms[0].options.value.forEach((item) => {
                const platform = {
                    title: item.title.value,
                    slug: item.url.value,
                    codename: item.platform.value[0].codename,
                    icon: item.icon.value.length ? `${item.icon.value[0].url}?w=20&fm=pjpg&auto=format` : ''
                }
                order.push(platform);
            });

            if (platforms.value) {
                platforms = platforms.value;
            }

            order.forEach(orderItem => {
                platforms.forEach(platformItem => {
                    const codenameTemp = platformItem.platform && platformItem.platform.value.length ? platformItem.platform.value[0].codename : null;
                    const codename = platformItem.codename || codenameTemp;
                    if (orderItem.codename === codename) {
                        result.push(orderItem);
                    }
                });
            });
        }

        return result;
    }

module.exports = {
    articles,
    certificationTest,
    changelog,
    emailNotifications,
    footer,
    home,
    KCDetails,
    landingPage,
    languages,
    navigationItems,
    normalizePlatforms,
    notFound,
    platformsConfig,
    platformsConfigPairings,
    redirectRules,
    references,
    releaseNotes,
    releaseNoteType,
    subNavigation,
    survey,
    termDefinitions,
    trainingPersonaTaxonomyGroup,
    trainingTopicTaxonomyGroup,
    trainingSubscriptions,
    trainingCourse,
    traniningUser,
    tree,
    UIMessages
};
