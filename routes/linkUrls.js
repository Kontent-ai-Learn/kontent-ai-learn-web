const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const cacheHandle = require('../helpers/cache/handle');
const helper = require('../helpers/general/helper');
const getUrlMap = require('../helpers/general/urlMap');

router.get('/:codenames', asyncHandler(async (req, res, next) => {
    const codenames = req.params.codenames.split('/');

    if (codenames.length === 0) {
        return next();
    } else {
        await cacheHandle.evaluateCommon(res, ['urlMap']);

        const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
            return await getUrlMap(res);
        });

        const urlsWithCodename = urlMap && urlMap.filter(elem => elem.codename === codenames[0]);
        let resolvedUrl = urlsWithCodename && urlsWithCodename.length && urlsWithCodename[0].url;

        resolvedUrl = helper.preserveQueryString(resolvedUrl, req.query);

        if (resolvedUrl) {
            return res.redirect(303, resolvedUrl);
        } else {
            return next();
        }
    }
}));

module.exports = router;
