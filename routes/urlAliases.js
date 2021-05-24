const commonContent = require('../helpers/commonContent');
const getUrlMap = require('../helpers/urlMap');
const handleCache = require('../helpers/handleCache');
const helper = require('../helpers/helperFunctions');

const urlAliases = async (req, res, next) => {
    const urlSplit = req.originalUrl.split('?');
    const queryParamater = urlSplit[1] ? urlSplit[1] : '';
    const originalUrl = urlSplit[0].trim().toLowerCase().replace(/\/\s*$/, '');
    const articles = await handleCache.ensureSingle(res, 'articles', async () => {
        return commonContent.getArticles(res);
    });
    const scenarios = await handleCache.ensureSingle(res, 'scenarios', async () => {
        return await commonContent.getScenarios(res);
    });
    const trainingCourses = await handleCache.evaluateSingle(res, 'trainingCourses', async () => {
        return await commonContent.getTraniningCourse(res);
    });
    const references = await handleCache.ensureSingle(res, 'apiSpecifications', async () => {
        return commonContent.getReferences(res);
    });

    const items = [...articles, ...references, ...scenarios, ...trainingCourses];
    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });
    let redirectUrl = [];

    items.forEach((item) => {
        const aliases = helper.getRedirectUrls(item.redirect_urls);

        aliases.forEach(alias => {
            alias = alias.trim().toLowerCase().replace(/\/\s*$/, '');
            if (alias === originalUrl) {
                redirectUrl = urlMap.filter(url => {
                    return url.codename === item.system.codename;
                });
            }
        });
    });

    if (redirectUrl.length) {
        return res.redirect(301, `${redirectUrl[0].url}${queryParamater ? '?' + queryParamater : ''}`);
    } else {
        const err = new Error('Not Found');
        err.status = 404;
        return next(err);
    }
};

module.exports = urlAliases;
