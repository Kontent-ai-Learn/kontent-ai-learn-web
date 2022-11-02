const cacheHandle = require('../cache/handle');
const requestDelivery = require('../kontent/requestDelivery');
const getContent = require('../kontent/getContent');

const getFirstPlatformByConfig = async (preselectedPlatform, items, res) => {
    const platformsConfig = await platforms.getPlatformsConfig(res);
    let firstPlatform;
    for (let i = 0; i < platformsConfig.linkedItems.length; i++) {
        for (let j = 0; j < items.length; j++) {
            let itemPlatform = items[j].codename;

            if (!itemPlatform) {
                itemPlatform = items[j].elements.platform.value[0].codename;
            }

            if (platformsConfig.linkedItems[i].elements.platform.value[0].codename === itemPlatform) {
                firstPlatform = itemPlatform;
                break;
            }
        }

        if (firstPlatform) {
            break;
        }
    }

    if (firstPlatform) {
        preselectedPlatform = firstPlatform;
    }

    return preselectedPlatform;
};

const platforms = {
    getSelectedPlatform: (platformsConfig, cookiesPlatform) => {
        let platform = platformsConfig ? platformsConfig.linkedItems.filter(item => item.system.codename === cookiesPlatform) : null;
        if (platform && platform.length) {
            platform = platform[0].elements.url.value
        } else {
            platform = null;
        }
        return platform;
    },
    getPlatformsConfig: async (res) => {
        const platformsConfig = await cacheHandle.ensureSingle(res, 'platformsConfig', async () => {
            return getContent.platformsConfig(res);
        });
        return (platformsConfig && platformsConfig.length
        ? platformsConfig[0].elements.options
        : null);
    },
    getMultiplatformArticleContent: async (content, preselectedPlatform, urlMap, KCDetails, res) => {
        const platformItem = content[0].elements.children.linkedItems.filter(item => {
            if (item.elements.platform.value.length) {
                return item.elements.platform.value[0].codename === preselectedPlatform;
            }
            return false;
        });

        const availablePlatforms = content[0].elements.children;

        if (!platformItem.length && availablePlatforms.linkedItems.length) {
            platformItem.push(availablePlatforms.linkedItems[0]);
        }

        if (platformItem.length) {
            content = await cacheHandle.evaluateSingle(res, platformItem[0].system.codename, async () => {
                return await requestDelivery({
                    codename: platformItem[0].system.codename,
                    type: 'article',
                    depth: 2,
                    resolveRichText: true,
                    urlMap: urlMap,
                    ...KCDetails
                });
            });
        } else {
            return null;
        }

        return {
            content: content,
            availablePlatforms: availablePlatforms
        }
    },
    getDefaultPlatform: async (req, res, content, preselectedPlatform) => {
        let items;
        preselectedPlatform = req.cookies['KCDOCS.preselectedLanguage'];

        if (content && content.elements.children && content.elements.children.linkedItems.length) {
            items = content.elements.children.linkedItems;
        } else if (content && content.elements.platform && content.elements.platform.value.length) {
            items = content.elements.platform.value;
        }

        if (items) {
            preselectedPlatform = await getFirstPlatformByConfig(preselectedPlatform, items, res);
        }

        return preselectedPlatform;
    },
    getAvailablePlatform: async (content, preselectedPlatform, res) => {
        let platformItems;
        if (content && content.elements.children) {
            platformItems = content.elements.children.linkedItems.filter(item => {
                if (item.elements.platform.value.length) {
                    return item.elements.platform.value[0].codename === preselectedPlatform;
                }
                return false;
            });

            if (platformItems.length) {
                preselectedPlatform = platformItems[0].elements.platform.value[0].codename;
            } else {
                preselectedPlatform = await getFirstPlatformByConfig(preselectedPlatform, content.elements.children.linkedItems, res);
            }
        } else {
            platformItems = content.elements.platform.value.filter(item => item.codename === preselectedPlatform);

            if (platformItems.length) {
                preselectedPlatform = platformItems[0].codename;
            } else {
                if (content.elements.platform.value.length) {
                    preselectedPlatform = content.elements.platform.value[0].codename;
                }
            }
        }

        return preselectedPlatform;
    },
    getPreselectedPlatform: async (content, cookiesPlatform, req, res) => {
        const platformsConfig = await platforms.getPlatformsConfig(res);
        let preselectedPlatform = req.query.tech;

        if (preselectedPlatform) {
            const tempPlatforms = platformsConfig ? platformsConfig.linkedItems.filter(item => item.elements.url.value === preselectedPlatform) : null;
            if (tempPlatforms && tempPlatforms.length) {
                preselectedPlatform = tempPlatforms[0].system.codename;
                cookiesPlatform = preselectedPlatform;
            }
        }

        if (!preselectedPlatform) {
            if (cookiesPlatform) {
                preselectedPlatform = cookiesPlatform;
            } else {
                preselectedPlatform = await platforms.getDefaultPlatform(req, res, content, preselectedPlatform);
            }
        } else {
            preselectedPlatform = await platforms.getAvailablePlatform(content, preselectedPlatform, res);
        }

        return {
            preselectedPlatform: preselectedPlatform,
            cookiesPlatform: cookiesPlatform
        };
    },
    getPreselectedPlatformByConfig: (preselectedPlatform, platformsConfig) => {
        preselectedPlatform = platformsConfig ? platformsConfig.linkedItems.filter(item => item.system.codename === preselectedPlatform) : null;
        if (preselectedPlatform && preselectedPlatform.length) {
            preselectedPlatform = preselectedPlatform[0].elements.url.value;
        } else {
            preselectedPlatform = null;
        }
        return preselectedPlatform;
    },
    getCanonicalUrl: (urlMap, content, preselectedPlatform) => {
        let canonicalUrl;
        if (content && ((content.system.type === 'article' && content.elements.platform.value.length > 1) || (content.system.type === 'multiplatform_article' && content.elements.children.length && preselectedPlatform === content.elements.children.linkedItems[0].elements.platform.value[0].codename))) {
            canonicalUrl = urlMap.filter(item => item.codename === content.system.codename);
            canonicalUrl = canonicalUrl.length ? canonicalUrl[0].url : null;
        }
        return canonicalUrl;
    }
};

module.exports = platforms;
