const commonContent = require('../helpers/commonContent');
const minify = require('../helpers/minify');
const helper = require('../helpers/helperFunctions');
const handleCache = require('../helpers/handleCache');
const smartLink = require('../helpers/smartLink');
const isPreview = require('../helpers/isPreview');
const asyncHandler = require('express-async-handler');

const error = asyncHandler(async (req, res) => {
    const footer = await handleCache.ensureSingle(res, 'footer', async (res) => {
        return commonContent.getFooter(res);
    });
    const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
        return commonContent.getUIMessages(res);
    });

    const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);

    const content = await handleCache.ensureSingle(res, 'notFound', async () => {
        return commonContent.getNotFound(res);
    });

    const home = await handleCache.ensureSingle(res, 'home', async () => {
        return commonContent.getHome(res);
    });

    if (!footer || !UIMessages || !content || !home) {
        return res.status(500).send('Unexpected error, please check site logs.');
    }
    const siteIsPreview = isPreview(res.locals.previewapikey);

    return res.render('pages/error', {
        req: req,
        minify: minify,
        slug: '404',
        isPreview: siteIsPreview,
        language: res.locals.language,
        navigation: process.env.KK_NEW_STRUCTURE ? home[0].subpages.value : home[0].navigation.value,
        itemId: content && content.length ? content[0].system.id : null,
        title: content && content.length ? content[0].title.value : '',
        content: content && content.length ? content[0].content.value : '',
        footer: footer && footer.length ? footer[0] : null,
        UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
        platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
        helper: helper,
        status: req.err && req.err.status ? req.err.status : null,
        smartLink: siteIsPreview ? smartLink : null
    });
});

module.exports = error;
