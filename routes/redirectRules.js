const express = require('express');
const router = express.Router();

const cacheHandle = require('../helpers/cache/handle');
const getContent = require('../helpers/kontent/getContent');
const helper = require('../helpers/general/helper')

router.get('*', async (req, res, next) => {
    const rules = await cacheHandle.evaluateSingle(res, 'redirectRules', async () => {
        return await getContent.redirectRules(res);
    });
    const normalizedUrlPath = req.originalUrl.toLowerCase().split('?')[0];

    if (rules) {
        for (let i = 0; i < rules.length; i++) {
            if (rules[i].elements.redirect_to && rules[i].elements.redirect_to.value && rules[i].elements.redirect_from && rules[i].elements.redirect_from.value) {
                const normalizedRedirectFrom = `/learn${helper.addTrailingSlashTo(rules[i].elements.redirect_from.value)}`;
                if (normalizedRedirectFrom === normalizedUrlPath) {
                    const url = rules[i].elements.redirect_to.value.includes('://') ? rules[i].elements.redirect_to.value : `/learn${helper.addTrailingSlashTo(rules[i].elements.redirect_to.value)}`;
                    return res.redirect(301, url);
                }
            }
        }
    }

    return next();
});

module.exports = router;
