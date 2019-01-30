const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const requestDelivery = require('../helpers/requestDelivery');
const getUrlMap = require('../helpers/urlMap');
const minify = require('../helpers/minify');
const isPreview = require('../helpers/isPreview');

const moment = require('moment');

const getNavigation = async (res) => {
    return await requestDelivery({
        type: 'home',
        depth: 1,
        projectid: res.locals.projectid,
        previewapikey: res.locals.previewapikey
    });
};

const getSubNavigation = async (res) => {
    return await requestDelivery({
        type: 'navigation_item',
        depth: 3,
        slug: 'tutorials',
        projectid: res.locals.projectid,
        previewapikey: res.locals.previewapikey
    });
};

const getSubNavigationLevels = (req) => {
    return [
        typeof req.params.scenario !== 'undefined' ? req.params.scenario : null,
        typeof req.params.topic !== 'undefined' ? req.params.topic : null,
        typeof req.params.article !== 'undefined' ? req.params.article : null
    ];
};

const getContentLevel = async (currentLevel, req, res) => {
    let settings = {
        projectid: res.locals.projectid,
        previewapikey: res.locals.previewapikey,
        slug: getSubNavigationLevels(req)[currentLevel],
        depth: 1
    };
    let urlMapSettings = {
        projectid: res.locals.projectid,
        previewapikey: res.locals.previewapikey,
    }

    if (currentLevel === -1) {
        settings.type = 'navigation_item';
        settings.slug = req.originalUrl.split('/')[1];
        delete settings.depth;
    } else if (currentLevel === 0) {
        settings.type = 'scenario';
        settings.resolveRichText = true;
        settings.urlMap = await getUrlMap(urlMapSettings);
    } else if (currentLevel === 1) {
        settings.type = 'topic';
    } else if (currentLevel === 2) {
        settings.type = 'article';
        settings.resolveRichText = true;
        settings.urlMap = await getUrlMap(urlMapSettings);
    }

    return await requestDelivery(settings);
};

router.get(['/', '/:scenario', '/:scenario/:topic', '/:scenario/:topic/:article'], asyncHandler(async (req, res, next) => {
    const navigation = await getNavigation(res);
    const subNavigation = await getSubNavigation(res);
    const subNavigationLevels = getSubNavigationLevels(req);
    const currentLevel = subNavigationLevels.filter( item => item !== null ).length - 1;
    const content = await getContentLevel(currentLevel, req, res);
    let view = 'pages/article';

    if (content[0]) {
        if (currentLevel === -1) {
            return res.redirect(`/tutorials/${content[0].children[0].url.value}`);
        } else if (currentLevel === 0) {
            view = 'pages/scenario';
        } else if (currentLevel === 1) {
            return res.redirect(`/tutorials/${subNavigationLevels[currentLevel - 1]}/${subNavigationLevels[currentLevel]}/${content[0].children[0].url.value}`);
        }
    } else {
        return next();
    }

    return res.render(view, {
        req: req,
        moment: moment,
        minify: minify,
        isPreview: isPreview(res.locals.previewapikey),
        projectId: res.locals.projectid,
        title: content[0].title.value,
        description: content[0].description.value,
        navigation: navigation[0] ? navigation[0].navigation : [],
        subNavigation: subNavigation[0] ? subNavigation[0].children : [],
        subNavigationLevels: subNavigationLevels,
        content: content[0]
    });
}));

module.exports = router;