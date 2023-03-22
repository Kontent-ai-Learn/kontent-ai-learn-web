const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const postprocessMarkup = require('../helpers/resolve/postprocessMarkup');
const isPreview = require('../helpers/kontent/isPreview');
const getContent = require('../helpers/kontent/getContent');
const smartLink = require('../helpers/kontent/smartLink');
const helper = require('../helpers/general/helper');
const cacheHandle = require('../helpers/cache/handle');

router.get('/', asyncHandler(async (req, res, next) => {
    const home = await cacheHandle.ensureSingle(res, 'home', async () => {
        return await getContent.home(res);
    });

    if (!home.length) {
        return next();
    }

    const footer = await cacheHandle.ensureSingle(res, 'footer', async () => {
        return await getContent.footer(res);
    });

    const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
        return await getContent.UIMessages(res);
    });
    const siteIsPreview = isPreview(res.locals.previewapikey);

    return res.render('pages/subscriptionReport', {
        req: req,
        res: res,
        postprocessMarkup: postprocessMarkup,
        slug: 'subscription-report',
        isPreview: siteIsPreview,
        language: res.locals.language,
        itemId: null,
        UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
        title: UIMessages && UIMessages.length ? helper.getValue(UIMessages[0], 'subscription_report_title') : '',
        description: '',
        navigation: home[0].elements.subpages.linkedItems,
        footer: footer && footer.length ? footer[0] : null,
        helper: helper,
        smartLink: siteIsPreview ? smartLink : null,
        isSubscriptionReport: true
      });
}));

module.exports = router;
