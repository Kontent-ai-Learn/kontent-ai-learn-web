const getContent = require('../helpers/kontent/getContent');
const cacheHandle = require('../helpers/cache/handle');
const helper = require('../helpers/general/helper');
const getUrlMap = require('../helpers/general/urlMap');

const urlAliases = async (req, res, next) => {
    const urlSplit = req.originalUrl.split('?');
    const queryParamater = urlSplit[1] ? urlSplit[1] : '';
    const originalUrl = urlSplit[0].trim().toLowerCase();
    const articles = await cacheHandle.ensureSingle(res, 'articles', async () => {
        return getContent.articles(res);
    });
    const landingPages = await cacheHandle.evaluateSingle(res, 'landingPages', async () => {
        return await getContent.landingPage(res);
    });
    const certificationTests = await cacheHandle.evaluateSingle(res, 'trainingCertificationTests', async () => {
        return await getContent.certificationTest(res);
      });
    const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
        return await getContent.trainingCourse(res);
    });
    const references = await cacheHandle.ensureSingle(res, 'apiSpecifications', async () => {
        return getContent.references(res);
    });

    const items = [...articles, ...landingPages, ...certificationTests.items, ...references, ...trainingCourses];
    const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });
    let redirectUrl = [];

    items.forEach((item) => {
        const aliases = helper.getRedirectUrls(item.redirect_urls);

        aliases.forEach(alias => {
            alias = alias.trim().toLowerCase();
            if (`/learn${helper.addTrailingSlashTo(alias)}` === helper.addTrailingSlashTo(originalUrl)) {
                redirectUrl = urlMap.filter(url => {
                    return url.codename === item.system.codename;
                });
            }
        });
    });

    if (redirectUrl.length) {
        return res.redirect(301, `${redirectUrl[0].url}${queryParamater ? `?${queryParamater}` : ''}`);
    } else {
        const err = new Error('Not Found');
        err.status = 404;
        return next(err);
    }
};

module.exports = urlAliases;
