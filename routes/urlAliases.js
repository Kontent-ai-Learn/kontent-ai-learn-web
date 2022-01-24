const commonContent = require('../helpers/commonContent');
const handleCache = require('../helpers/handleCache');
const helper = require('../helpers/helperFunctions');
const getUrlMap = require('../helpers/urlMap');

const urlAliases = async (req, res, next) => {
    const urlSplit = req.originalUrl.split('?');
    const queryParamater = urlSplit[1] ? urlSplit[1] : '';
    const originalUrl = urlSplit[0].trim().toLowerCase().replace(/\/\s*$/, '');
    const articles = await handleCache.ensureSingle(res, 'articles', async () => {
        return commonContent.getArticles(res);
    });
    const trainingCourses = await handleCache.evaluateSingle(res, 'trainingCourses', async () => {
        return await commonContent.getTraniningCourse(res);
    });
    const references = await handleCache.ensureSingle(res, 'apiSpecifications', async () => {
        return commonContent.getReferences(res);
    });

    const items = [...articles, ...references, ...trainingCourses];
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
        if (res.locals.urlPathPrefix && redirectUrl[0].url === '/') redirectUrl[0].url = '';
        return res.redirect(301, `${res.locals.urlPathPrefix}${redirectUrl[0].url}${queryParamater ? '?' + queryParamater : ''}`);
    } else {
        const err = new Error('Not Found');
        err.status = 404;
        return next(err);
    }
};

module.exports = urlAliases;
