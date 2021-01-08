const cache = require('memory-cache');
const requestDelivery = require('./requestDelivery');
const getUrlMap = require('./urlMap');
const ensureSingle = require('./ensureSingle');
const isPreview = require('./isPreview');

const commonContent = {
    getKCDetails: (res) => {
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
            host: res.locals.host,
            protocol: res.locals.protocol,
            isPreview: isPreview(res.locals.previewapikey),
            isKenticoIP: res.locals.isKenticoIP,
            UIMessages: UIMessages
        };
    },
    getTree: async (contentType, depth, res) => {
        const KCDetails = commonContent.getKCDetails(res);
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: contentType,
            depth: depth,
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails
        });
    },
    getFooter: async (res) => {
        return await requestDelivery({
            type: 'footer',
            ...commonContent.getKCDetails(res)
        });
    },
    getSubNavigation: async (res, codename) => {
        return await requestDelivery({
            type: 'navigation_item',
            depth: 3,
            codename: codename,
            ...commonContent.getKCDetails(res)
        });
    },
    getUIMessages: async (res) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'ui_messages',
            resolveRichText: true,
            urlMap: urlMap,
            ...commonContent.getKCDetails(res)
        });
    },
    getHome: async (res) => {
        const KCDetails = commonContent.getKCDetails(res);
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'home',
            depth: 4,
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails
        });
    },
    getArticles: async (res) => {
        return await requestDelivery({
            type: ['article', 'multiplatform_article'],
            ...commonContent.getKCDetails(res)
        });
    },
    getScenarios: async (res) => {
        return await requestDelivery({
            type: 'scenario',
            ...commonContent.getKCDetails(res)
        });
    },
    getChangelog: async (res) => {
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            codename: 'product_changelog',
            resolveRichText: true,
            urlMap: urlMap,
            ...commonContent.getKCDetails(res)
        });
    },
    getTraniningCourse: async (res) => {
        return await requestDelivery({
            type: 'training_course',
            ...commonContent.getKCDetails(res)
        });
    },
    getNotFound: async (res) => {
        const KCDetails = commonContent.getKCDetails(res);
        const urlMap = await ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });
        return await requestDelivery({
            type: 'not_found',
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails
        });
    },
    getNavigationItems: async (res) => {
        return await requestDelivery({
            type: 'navigation_item',
            ...commonContent.getKCDetails(res)
        });
    },
    getReferences: async (res) => {
        return await requestDelivery({
            type: 'zapi_specification',
            ...commonContent.getKCDetails(res)
        });
    },
    getRedirectRules: async (res) => {
        return await requestDelivery({
            type: 'redirect_rule',
            ...commonContent.getKCDetails(res)
        });
    },
    getTrainingCourseType: async (res) => {
        return await requestDelivery({
            data: 'type',
            type: 'training_course',
            ...commonContent.getKCDetails(res)
        });
    },
    getReleaseNoteType: async (res) => {
        return await requestDelivery({
            data: 'type',
            type: 'release_note',
            ...commonContent.getKCDetails(res)
        });
    },
    getReleaseNotes: async (res) => {
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
            ...commonContent.getKCDetails(res)
        });
    },
    getTermDefinitions: async (res) => {
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
            ...commonContent.getKCDetails(res)
        });
    },
    getPlatformsConfig: async (res) => {
        return await requestDelivery({
            type: 'platform_picker',
            codename: 'platform_picker',
            ...commonContent.getKCDetails(res)
        });
    },
    getPlatformsConfigPairings: async (res) => {
        const cachedPlatforms = await ensureSingle(res, 'platformsConfig', async () => {
            return await commonContent.getPlatformsConfig(res);
        });
        const pairings = [];

        if (cachedPlatforms && cachedPlatforms.length) {
            cachedPlatforms[0].options.value.forEach((item) => {
                pairings.push({
                    url: item.url.value,
                    platform: item.platform.value[0].codename
                });
            });
        }

        return pairings;
    },
    normalizePlatforms: async (platforms, res) => {
        const result = [];
        const order = [];
        let cachedPlatforms = await ensureSingle(res, 'platformsConfig', async () => {
            return await commonContent.getPlatformsConfig(res);
        });

        if (!cachedPlatforms) {
            cachedPlatforms = await commonContent.getPlatformsConfig(res);
        }

        if (platforms && cachedPlatforms && cachedPlatforms.length) {
            cachedPlatforms[0].options.value.forEach((item) => {
                const platform = {
                    title: item.title.value,
                    slug: item.url.value,
                    codename: item.platform.value[0].codename,
                    icon: item.icon.value.length ? `${item.icon.value[0].url}?w=20` : ''
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
}

module.exports = commonContent;
