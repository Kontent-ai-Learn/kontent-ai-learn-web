const express = require('express');
const router = express.Router();
const moment = require('moment');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();
const asyncHandler = require('express-async-handler');

const handleCache = require('../helpers/handleCache');
const commonContent = require('../helpers/commonContent');
const helper = require('../helpers/helperFunctions');
const getUrlMap = require('../helpers/urlMap');

router.get('/changelog', asyncHandler(async (req, res) => {
    const home = await handleCache.ensureSingle(res, 'home', async () => {
        return commonContent.getHome(res);
    });
    const changelog = await handleCache.ensureSingle(res, 'product_changelog', async () => {
        return commonContent.getChangelog(res);
    });
    const releaseNotes = await handleCache.evaluateSingle(res, 'releaseNotes', async () => {
        return await commonContent.getReleaseNotes(res);
    });
    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });

    const path = urlMap.filter((item) => { return item.codename === 'product_changelog' });

    res.set('Content-Type', 'application/xml');

    return res.render('tutorials/pages/rssApiChangelog', {
        req: req,
        helper: helper,
        home: home[0],
        entities: entities,
        moment: moment,
        title: changelog[0].title.value,
        releaseNotes: releaseNotes,
        domain: helper.getDomain(),
        path: path && path.length ? path[0].url : ''
    });
}));

module.exports = router;
