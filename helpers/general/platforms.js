const cacheHandle = require('../cache/handle');
const requestDelivery = require('../kontent/requestDelivery');
const getContent = require('../kontent/getContent');

const getFirstPlatformByConfig = async (preselectedPlatform, items, res) => {
    const platformsConfig = await platforms.getPlatformsConfig(res);
    let firstPlatform;
    for (let i = 0; i < platformsConfig.value.length; i++) {
        for (let j = 0; j < items.length; j++) {
            let itemPlatform = items[j].codename;

            if (!itemPlatform) {
                itemPlatform = items[j].platform.value[0].codename;
            }

            if (platformsConfig.value[i].platform.value[0].codename === itemPlatform) {
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
        let platform = platformsConfig ? platformsConfig.value.filter(item => item.system.codename === cookiesPlatform) : null;
        if (platform && platform.length) {
            platform = platform[0].url.value
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
        ? platformsConfig[0].options
        : null);
    },
    getMultiplatformArticleContent: async (content, preselectedPlatform, urlMap, KCDetails, res) => {
        const platformItem = content[0].children.value.filter(item => {
            if (item.platform.value.length) {
                return item.platform.value[0].codename === preselectedPlatform;
            }
            return false;
        });

        const availablePlatforms = content[0].children;

        if (!platformItem.length && availablePlatforms.value.length) {
            platformItem.push(availablePlatforms.value[0]);
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

        if (content && content.children && content.children.value.length) {
            items = content.children.value;
        } else if (content && content.platform && content.platform.value.length) {
            items = content.platform.value;
        }

        if (items) {
            preselectedPlatform = await getFirstPlatformByConfig(preselectedPlatform, items, res);
        }

        return preselectedPlatform;
    },
    getAvailablePlatform: async (content, preselectedPlatform, res) => {
        let platformItems;
        if (content && content.children) {
            platformItems = content.children.value.filter(item => {
                if (item.platform.value.length) {
                    return item.platform.value[0].codename === preselectedPlatform;
                }
                return false;
            });

            if (platformItems.length) {
                preselectedPlatform = platformItems[0].platform.value[0].codename;
            } else {
                preselectedPlatform = await getFirstPlatformByConfig(preselectedPlatform, content.children.value, res);
            }
        } else {
            platformItems = content.platform.value.filter(item => item.codename === preselectedPlatform);

            if (platformItems.length) {
                preselectedPlatform = platformItems[0].codename;
            } else {
                if (content.platform.value.length) {
                    preselectedPlatform = content.platform.value[0].codename;
                }
            }
        }

        return preselectedPlatform;
    },
    getPreselectedPlatform: async (content, cookiesPlatform, req, res) => {
        const platformsConfig = await platforms.getPlatformsConfig(res);
        let preselectedPlatform = req.query.tech;

        if (preselectedPlatform) {
            const tempPlatforms = platformsConfig ? platformsConfig.value.filter(item => item.url.value === preselectedPlatform) : null;
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
        preselectedPlatform = platformsConfig ? platformsConfig.value.filter(item => item.system.codename === preselectedPlatform) : null;
        if (preselectedPlatform && preselectedPlatform.length) {
            preselectedPlatform = preselectedPlatform[0].url.value;
        } else {
            preselectedPlatform = null;
        }
        return preselectedPlatform;
    },
    getCanonicalUrl: (urlMap, content, preselectedPlatform) => {
        let canonicalUrl;
        if (content && ((content.system.type === 'article' && content.platform.value.length > 1) || (content.system.type === 'multiplatform_article' && content.children.length && preselectedPlatform === content.children[0].platform.value[0].codename))) {
            canonicalUrl = urlMap.filter(item => item.codename === content.system.codename);
            canonicalUrl = canonicalUrl.length ? canonicalUrl[0].url : null;
        }
        return canonicalUrl;
    }
};

module.exports = platforms;
