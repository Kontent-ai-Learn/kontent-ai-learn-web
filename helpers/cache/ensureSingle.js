const cache = require('memory-cache');

const ensureSingle = async (res, keyName, method) => {
    const KCDetails = {
        projectid: res.locals.projectid,
        previewapikey: res.locals.previewapikey,
        securedapikey: res.locals.securedapikey
    };

    if (!cache.get(`${keyName}_${KCDetails.projectid}`)) {
        const data = await method(res);
        cache.put(`${keyName}_${KCDetails.projectid}`, data);
    }
    return cache.get(`${keyName}_${KCDetails.projectid}`);
};

module.exports = ensureSingle;
