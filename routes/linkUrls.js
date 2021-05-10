const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const handleCache = require('../helpers/handleCache');
const helper = require('../helpers/helperFunctions');

let getUrlMap;
if (process.env.KK_NEW_STRUCTURE === 'true') {
  getUrlMap = require('../helpers/urlMap');
} else {
  getUrlMap = require('../helpers/urlMap_Obsolete');
}

router.get('/:codenames', asyncHandler(async (req, res, next) => {
    const codenames = req.params.codenames.split('/');

    if (codenames.length === 0) {
        return next();
    } else {
        await handleCache.evaluateCommon(res, ['urlMap']);

        const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
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
