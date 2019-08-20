const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const asyncHandler = require('express-async-handler');

const handleCache = require('../helpers/handleCache');
const commonContent = require('../helpers/commonContent');

router.get('/:codenames', asyncHandler(async (req, res, next) => {
    const codenames = req.params.codenames.split('/');

    if (codenames.length === 0) {
        return next();
    } else {
        await handleCache.evaluateCommon(res, ['urlMap']);

        const KCDetails = commonContent.getKCDetails(res);
        const urlMap = await cache.get(`urlMap_${KCDetails.projectid}`);

        const urlsWithCodename = urlMap && urlMap.filter(elem => elem.codename === codenames[0]);
        const resolvedUrl = urlsWithCodename && urlsWithCodename.length && urlsWithCodename[0].url;

        if (resolvedUrl) {
            return res.redirect(303, resolvedUrl);
        } else {
            return next();
        }
    }
}));

module.exports = router;
