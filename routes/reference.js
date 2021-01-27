const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const moment = require('moment');
const htmlparser2 = require('htmlparser2');
const cheerio = require('cheerio');

const commonContent = require('../helpers/commonContent');
const handleCache = require('../helpers/handleCache');
const requestDelivery = require('../helpers/requestDelivery');
const helper = require('../helpers/helperFunctions');
const minify = require('../helpers/minify');
const platforms = require('../helpers/platforms');
const getUrlMap = require('../helpers/urlMap');
const customRichTextResolver = require('../helpers/customRichTextResolver');
const smartLink = require('../helpers/smartLink');

const handleArticle = async (settings, req, res) => {
    settings.renderSettings.view = 'apiReference/pages/reference';
    let parentSlug = req.originalUrl.split('/')[1];
    parentSlug = parentSlug.split('?')[0];
    const codename = helper.getCodenameByUrl(`/${parentSlug}`, settings.urlMap);
    const subNavigation = await handleCache.evaluateSingle(res, `subNavigation_${codename}`, async () => {
        return await commonContent.getSubNavigation(res, codename);
    });
    const articles = await handleCache.ensureSingle(res, 'articles', async () => {
        return commonContent.getArticles(res);
    });
    const references = await handleCache.ensureSingle(res, 'apiSpecifications', async () => {
        return commonContent.getReferences(res);
    });
    const termDefinitions = await handleCache.evaluateSingle(res, 'termDefinitions', async () => {
        return await commonContent.getTermDefinitions(res);
    });

    const platformsConfig = await platforms.getPlatformsConfig(res);
    let cookiesPlatform = req.cookies['KCDOCS.preselectedLanguage'];
    let availablePlatforms;
    let preselectedPlatform;
    let releaseNoteContentType;
    let trainingCourseContentType;
    let containsChangelog;
    let containsTerminology;
    let containsTrainingCourse;

    if (settings.content && settings.content.length) {
        containsChangelog = helper.hasLinkedItemOfType(settings.content[0].content, 'changelog');
        containsTerminology = helper.hasLinkedItemOfType(settings.content[0].content, 'terminology');
        containsTrainingCourse = helper.hasLinkedItemOfType(settings.content[0].content, 'training_course');

        if (containsChangelog) {
            req.app.locals.changelogPath = helper.getPathWithoutQS(req.originalUrl);
            releaseNoteContentType = await handleCache.evaluateSingle(res, 'releaseNoteContentType', async () => {
                return await commonContent.getReleaseNoteType(res);
            });
        }

        if (containsTerminology) {
            req.app.locals.terminologyPath = helper.getPathWithoutQS(req.originalUrl);
        }

        if (containsTrainingCourse) {
            req.app.locals.elearningPath = helper.getPathWithoutQS(req.originalUrl);
            trainingCourseContentType = await handleCache.evaluateSingle(res, 'trainingCourseContentType', async () => {
                return await commonContent.getTrainingCourseType(res);
            });
        }

        settings.content[0].content.value = await customRichTextResolver(settings.content[0].content.value, req, res);
    }

    const preselectedPlatformSettings = await platforms.getPreselectedPlatform(settings.content[0], cookiesPlatform, req, res);

    if (!preselectedPlatformSettings) {
        return null;
    }

    preselectedPlatform = preselectedPlatformSettings.preselectedPlatform;
    cookiesPlatform = preselectedPlatformSettings.cookiesPlatform;

    if (cookiesPlatform !== req.cookies['KCDOCS.preselectedLanguage']) {
        res.cookie('KCDOCS.preselectedLanguage', cookiesPlatform);
    }

    const canonicalUrl = platforms.getCanonicalUrl(settings.urlMap, settings.content[0], preselectedPlatform);

    if (settings.content && settings.content.length && settings.content[0].system.type === 'multiplatform_article') {
        const multiplatformArticleContent = await platforms.getMultiplatformArticleContent(settings.content, preselectedPlatform, settings.urlMap, settings.KCDetails, res);

        if (!multiplatformArticleContent) {
            return null;
        }

        settings.content = multiplatformArticleContent.content;
        availablePlatforms = multiplatformArticleContent.availablePlatforms;
    }

    if (settings.content && settings.content.length) {
        const titleItems = [...articles, ...references];
        if (settings.content[0].introduction) {
            settings.content[0].introduction.value = helper.addTitlesToLinks(settings.content[0].introduction.value, settings.urlMap, titleItems);
        }

        if (settings.content[0].content) {
            settings.content[0].content.value = helper.addTitlesToLinks(settings.content[0].content.value, settings.urlMap, titleItems);
        }
        if (settings.content[0].next_steps) {
            settings.content[0].next_steps.value = helper.addTitlesToLinks(settings.content[0].next_steps.value, settings.urlMap, titleItems);
        }
    }

    preselectedPlatform = platforms.getPreselectedPlatformByConfig(preselectedPlatform, platformsConfig);

    settings.renderSettings.data.parentSlug = parentSlug;
    settings.renderSettings.data.selectedPlatform = platforms.getSelectedPlatform(platformsConfig, cookiesPlatform);
    settings.renderSettings.data.platform = settings.content && settings.content.length && settings.content[0].platform && settings.content[0].platform.value.length ? await commonContent.normalizePlatforms(settings.content[0].platform.value, res) : null;
    settings.renderSettings.data.availablePlatforms = await commonContent.normalizePlatforms(availablePlatforms, res);
    settings.renderSettings.data.preselectedPlatform = preselectedPlatform;
    settings.renderSettings.data.introduction = settings.content && settings.content.length && settings.content[0].introduction ? settings.content[0].introduction.value : null;
    settings.renderSettings.data.nextSteps = settings.content && settings.content.length && settings.content[0].next_steps ? settings.content[0].next_steps : '';
    settings.renderSettings.data.content = settings.content && settings.content.length ? settings.content[0] : null;
    settings.renderSettings.data.subNavigation = subNavigation && subNavigation.length ? subNavigation[0].children.value : [];
    settings.renderSettings.data.termDefinitions = termDefinitions && termDefinitions.length ? termDefinitions : null;
    settings.renderSettings.data.moment = moment;
    settings.renderSettings.data.canonicalUrl = canonicalUrl;
    settings.renderSettings.data.projectId = res.locals.projectid;
    settings.renderSettings.data.containsChangelog = containsChangelog;
    settings.renderSettings.data.releaseNoteContentType = releaseNoteContentType;
    settings.renderSettings.data.containsTrainingCourse = containsTrainingCourse;
    settings.renderSettings.data.trainingCourseContentType = trainingCourseContentType;
    settings.renderSettings.data.hideAuthorLastModified = settings.content && settings.content.length && settings.content[0].display_options ? helper.isCodenameInMultipleChoice(settings.content[0].display_options.value, 'hide_metadata') : false;
    settings.renderSettings.data.hideFeedback = settings.content && settings.content.length && settings.content[0].display_options? helper.isCodenameInMultipleChoice(settings.content[0].display_options.value, 'hide_feedback') : false;

    return settings.renderSettings;
};

const resolveLinks = (data, urlMap) => {
    // Resolve links in DOM
    const parserOptions = {
        decodeEntities: true,
        lowerCaseAttributeNames: false,
        lowerCaseTags: false,
        recognizeSelfClosing: false,
    };

    const dom = htmlparser2.parseDOM(data.data, parserOptions);
    const $ = cheerio.load(dom);
    const links = $('a[href]');

    for (let i = 0; i < links.length; i++) {
        const link = $(links[i]);

        if (link.attr('href').indexOf('/link-to/') > -1) {
            const urlParts = link.attr('href').split('/');
            const codename = urlParts[urlParts.length - 1];

            for (let i = 0; i < urlMap.length; i++) {
                if (urlMap[i].codename === codename) {
                    link.attr('href', urlMap[i].url);
                }
            }
        }
    }

    data.data = $.root().html().trim();

    // Resolve links in Markdown
    // eslint-disable-next-line no-useless-escape
    const regexLink = /(\]\()([a-zA-Z0-9-._~:\/?#\[\]@!\$&'\+,;=]*)(\))/g;
    data.data = data.data.replace(regexLink, (match, $1, $2, $3) => {
        let url = $2;

        if ($2.indexOf('/link-to/') > -1) {
            const urlParts = $2.split('/');
            const codename = urlParts[urlParts.length - 1];

            for (let i = 0; i < urlMap.length; i++) {
                if (urlMap[i].codename === codename) {
                    url = urlMap[i].url;
                }
            }
        }

        return $1 + url + $3;
    });

    return data;
};

const getRedocReference = async (apiCodename, res, KCDetails) => {
    return await handleCache.evaluateSingle(res, `reDocReference_${apiCodename}`, async () => {
        return await helper.getReferenceFiles(apiCodename, false, KCDetails, 'getRedocReference');
    });
};

router.get('/:main', asyncHandler(async (req, res, next) => {
    if (res.locals.router !== 'reference') {
        return next();
    }

    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });

    const itemCodename = helper.getCodenameByUrl(req.originalUrl, urlMap);
    const subNavigation = await handleCache.evaluateSingle(res, `subNavigation_${itemCodename}`, async () => {
        return await commonContent.getSubNavigation(res, itemCodename);
    });

    let redirectSlug = '';

    if (subNavigation[0] && subNavigation[0].children && subNavigation[0].children.value[0].url) {
        redirectSlug = subNavigation[0].children.value[0].url.value;
    }

    let slug = req.originalUrl.split('/')[1];
    slug = slug.split('?')[0];

    return res.redirect(301, `/${slug}/${redirectSlug}`);
}));

router.get('/:main/:slug', asyncHandler(async (req, res, next) => {
    if (res.locals.router !== 'reference') {
        return next();
    }

    const KCDetails = commonContent.getKCDetails(res);
    const slug = req.params.slug;

    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });
    const home = await handleCache.ensureSingle(res, 'home', async () => {
        return await commonContent.getHome(res);
    });
    const footer = await handleCache.ensureSingle(res, 'footer', async () => {
        return await commonContent.getFooter(res);
    });
    const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
        return await commonContent.getUIMessages(res);
    });

    const itemCodename = helper.getCodenameByUrl(req.originalUrl, urlMap);
    const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);

    const content = await handleCache.evaluateSingle(res, itemCodename, async () => {
        return await requestDelivery({
            codename: itemCodename,
            depth: 2,
            resolveRichText: true,
            urlMap: urlMap,
            ...KCDetails
        });
    });

    if (!urlMap[0]) {
        return next();
    }

    let renderSettings = {
        view: 'apiReference/pages/redoc',
        data: {
            req: req,
            minify: minify,
            slug: slug,
            isPreview: KCDetails.isPreview,
            isKenticoIP: helper.isKenticoIP(req),
            itemId: content && content.length ? content[0].system.id : null,
            title: content && content.length ? content[0].title.value : '',
            titleSuffix: ` | ${home && home.length ? home[0].title.value : 'Kentico Kontent Docs'}`,
            navigation: home && home.length ? home[0].navigation.value : null,
            footer: footer && footer.length ? footer[0] : null,
            UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
            platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
            helper: helper,
            smartLink: KCDetails.isPreview ? smartLink : null
        }
    };

    if (content && content.length && content[0].system.type === 'zapi_specification') {
        renderSettings.data.content = await getRedocReference(content[0].system.codename, res, KCDetails);
        renderSettings.data.content = resolveLinks(renderSettings.data.content, urlMap);
    } else {
        const settings = {
            renderSettings: renderSettings,
            content: content,
            urlMap: urlMap,
            KCDetails: KCDetails
        };

        renderSettings = await handleArticle(settings, req, res);
    }

    if (!renderSettings) {
        return next();
    }

    return res.render(renderSettings.view, renderSettings.data);
}));

module.exports = router;
