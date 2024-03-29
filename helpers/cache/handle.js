const cache = require('memory-cache');
const axios = require('axios');
const util = require('util');
const getContent = require('../kontent/getContent');
const { logInCacheKey } = require('../general/helper');
const getUrlMap = require('../general/urlMap');
// const github = require('../services/github');

const deleteCachePreviewCheck = (keyName, KCDetails, isPreviewRequest) => {
    if (isPreviewRequest && cache.get(`${keyName}_${KCDetails.projectid}`)) {
        cache.del(`${keyName}_${KCDetails.projectid}`);
    }
};

const remove = (keyName, KCDetails) => {
    cache.del(`${keyName}_${KCDetails.projectid}`);
};

const deleteMultipleKeys = (startsWithString, keys) => {
    if (!keys) {
        keys = cache.keys();
    }

    for (let i = 0; i < keys.length; i++) {
        if (keys[i].startsWith(startsWithString)) {
            cache.del(keys[i]);
        }
    }
};

const get = (keyName, KCDetails) => {
    return cache.get(`${keyName}_${KCDetails.projectid}`);
};

const put = (keyName, data, KCDetails) => {
    cache.put(`${keyName}_${KCDetails.projectid}`, data);
};

const manage = async (keyName, dataRetrieval, KCDetails, isPreviewRequest, res) => {
    deleteCachePreviewCheck(keyName, KCDetails, isPreviewRequest);
    if (!get(keyName, KCDetails)) {
        const data = await dataRetrieval(res);
        put(keyName, data, KCDetails);
    }
    return get(keyName, KCDetails);
};

const cacheKeys = [{
        name: 'platformsConfig',
        method: getContent.platformsConfig
    }, {
        name: 'urlMap',
        method: getUrlMap
    }, {
        name: 'footer',
        method: getContent.footer
    }, {
        name: 'UIMessages',
        method: getContent.UIMessages
    }, {
        name: 'home',
        method: getContent.home
    }, {
        name: 'articles',
        method: getContent.articles
    }, {
        name: 'notFound',
        method: getContent.notFound
    }, {
        name: 'navigationItems',
        method: getContent.navigationItems
    }, {
        name: 'releaseNotes',
        method: getContent.releaseNotes
    }, {
        name: 'redirectRules',
        method: getContent.redirectRules
    }, {
        name: 'termDefinitions',
        method: getContent.termDefinitions
    }, {
        name: 'trainingUsers',
        method: getContent.traniningUser
    }, {
        name: 'trainingCertificationTests',
        method: getContent.certificationTest
    }, {
        name: 'trainingCourses',
        method: getContent.trainingCourse
    }, {
        name: 'landingPages',
        method: getContent.landingPage
    }, {
        name: 'trainingSubscriptions',
        method: getContent.trainingSubscriptions
    }, {
        name: 'emailNotifications',
        method: getContent.emailNotifications
    }
];

const evaluateCommon = async (res, keysTohandle) => {
    const KCDetails = getContent.KCDetails(res);
    const processCache = async (array) => {
        for await (const item of array) {
            if (keysTohandle.indexOf(item.name) > -1) {
                await manage(item.name, async (res) => {
                    return await item.method(res);
                }, KCDetails, KCDetails.isPreview, res);
            }
        }
        return null;
    }
    return await processCache(cacheKeys);
};

const evaluateSingle = async (res, keyName, method) => {
    const KCDetails = getContent.KCDetails(res);
    return await manage(keyName, async (res) => {
        return await method(res);
    }, KCDetails, KCDetails.isPreview);
};

const ensureSingle = async (res, keyName, method) => {
    const KCDetails = getContent.KCDetails(res);

    if (!get(keyName, KCDetails)) {
        const data = await method(res);
        put(keyName, data, KCDetails);
    }
    return get(keyName, KCDetails);
};

const pool = async () => {
    const log = {
        timestamp: (new Date()).toISOString(),
        pool: util.inspect(cache.get('webhook-payload-pool'), {
            maxArrayLength: 500
        })
    };

    try {
        const response = await axios.post(`${process.env.BASE_URL}/learn/cache-invalidate/pool/`, {});
        log.url = response && response.config ? response.config.url : '';
        // await github.requestRedoclySync();
    } catch (error) {
        log.error = error && error.response ? error.response.data : '';
    }

    logInCacheKey('cache-interval-pool', log);
};

module.exports = {
    evaluateCommon,
    evaluateSingle,
    get,
    put,
    remove,
    pool,
    deleteMultipleKeys,
    ensureSingle
};
