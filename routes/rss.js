const express = require('express');
const router = express.Router();
const { decode } = require('html-entities');
const asyncHandler = require('express-async-handler');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Europe/Prague');

const cacheHandle = require('../helpers/cache/handle');
const getContent = require('../helpers/kontent/getContent');
const helper = require('../helpers/general/helper');
const getUrlMap = require('../helpers/general/urlMap');

router.get('/changelog', asyncHandler(async (req, res) => {
    const home = await cacheHandle.ensureSingle(res, 'home', async () => {
        return getContent.home(res);
    });
    const changelog = await cacheHandle.ensureSingle(res, 'product_changelog', async () => {
        return getContent.changelog(res);
    });
    const releaseNotes = await cacheHandle.evaluateSingle(res, 'releaseNotes', async () => {
        return await getContent.releaseNotes(res);
    });
    const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });

    const path = urlMap.filter((item) => { return item.codename === 'product_changelog' });

    res.set('Content-Type', 'application/xml');

    return res.render('pages/rssApiChangelog', {
        req: req,
        helper: helper,
        home: home[0],
        decode: decode,
        dayjs: dayjs,
        title: changelog[0].elements.title.value,
        releaseNotes: releaseNotes,
        domain: helper.getDomain(),
        path: path && path.length ? path[0].url : ''
    });
}));

module.exports = router;
