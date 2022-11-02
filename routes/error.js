const getContent = require('../helpers/kontent/getContent');
const postprocessMarkup = require('../helpers/resolve/postprocessMarkup');
const helper = require('../helpers/general/helper');
const cacheHandle = require('../helpers/cache/handle');
const smartLink = require('../helpers/kontent/smartLink');
const isPreview = require('../helpers/kontent/isPreview');
const asyncHandler = require('express-async-handler');

const error = asyncHandler(async (req, res) => {
    const footer = await cacheHandle.ensureSingle(res, 'footer', async (res) => {
        return getContent.footer(res);
    });
    const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
        return getContent.UIMessages(res);
    });

    const platformsConfigPairings = await getContent.platformsConfigPairings(res);

    const content = await cacheHandle.ensureSingle(res, 'notFound', async () => {
        return getContent.notFound(res);
    });

    const home = await cacheHandle.ensureSingle(res, 'home', async () => {
        return getContent.home(res);
    });

    if (!footer || !UIMessages || !content || !home) {
        return res.status(500).send('Unexpected error, please check site logs.');
    }
    const siteIsPreview = isPreview(res.locals.previewapikey);

    return res.render('pages/error', {
        req: req,
        res: res,
        postprocessMarkup: postprocessMarkup,
        slug: '404',
        isPreview: siteIsPreview,
        language: res.locals.language,
        navigation: home[0].elements.subpages.linkedItems,
        itemId: content && content.length ? content[0].system.id : null,
        title: content && content.length ? content[0].elements.title.value : '',
        content: content && content.length ? content[0].elements.content.value : '',
        footer: footer && footer.length ? footer[0] : null,
        UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
        platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
        helper: helper,
        status: req.err && req.err.status ? req.err.status : null,
        smartLink: siteIsPreview ? smartLink : null
    });
});

module.exports = error;
