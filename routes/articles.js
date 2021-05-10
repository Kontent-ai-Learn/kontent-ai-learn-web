const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const moment = require('moment');
const htmlparser2 = require('htmlparser2');
const cheerio = require('cheerio');

const requestDelivery = require('../helpers/requestDelivery');
const minify = require('../helpers/minify');
const commonContent = require('../helpers/commonContent');
const helper = require('../helpers/helperFunctions');
const handleCache = require('../helpers/handleCache');
const platforms = require('../helpers/platforms');
const getTrainingCourseInfo = require('../helpers/trainingCourse');
const customRichTextResolver = require('../helpers/customRichTextResolver');
const smartLink = require('../helpers/smartLink');
const fastly = require('../helpers/fastly');

const getUrlMap = require('../helpers/urlMap');

let cookiesPlatform;

const getItemContent = async (item, urlMap, res) => {
    const KCDetails = commonContent.getKCDetails(res);

    const settings = {
        codename: item.codename,
        depth: 2,
        ...KCDetails
    };

    if (item.type === 'navigation_item') {
        delete settings.depth;
    } else {
        settings.resolveRichText = true;
        settings.urlMap = urlMap;
    }

    return await handleCache.evaluateSingle(res, item.codename, async () => {
        return await requestDelivery(settings);
    });
};

const getRedocReference = async (apiCodename, res, KCDetails) => {
    return await handleCache.evaluateSingle(res, `reDocReference_${apiCodename}`, async () => {
        return await helper.getReferenceFiles(apiCodename, false, KCDetails, 'getRedocReference');
    });
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

const getContent = async (req, res) => {
    const KCDetails = commonContent.getKCDetails(res);

    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });
    const home = await handleCache.ensureSingle(res, 'home', async () => {
        return await commonContent.getHome(res);
    });

    let slug = req.originalUrl.split('/')[1];
    slug = slug.split('?')[0];
    const subnavCodename = helper.getCodenameByUrl(`/${slug}`, urlMap);

    let subNavigation;
    if (subnavCodename) {
        subNavigation = await handleCache.evaluateSingle(res, `subNavigation_${subnavCodename}`, async () => {
            return await commonContent.getSubNavigation(res, subnavCodename);
        });
    }

    const footer = await handleCache.ensureSingle(res, 'footer', async () => {
        return await commonContent.getFooter(res);
    });
    const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
        return await commonContent.getUIMessages(res);
    });
    const articles = await handleCache.ensureSingle(res, 'articles', async () => {
        return await commonContent.getArticles(res);
    });
    const references = await handleCache.ensureSingle(res, 'apiSpecifications', async () => {
        return await commonContent.getReferences(res);
    });
    const termDefinitions = await handleCache.evaluateSingle(res, 'termDefinitions', async () => {
        return await commonContent.getTermDefinitions(res);
    });

    const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);

    const urlMapItem = helper.getMapItemByUrl(req.originalUrl, urlMap);
    let content = await getItemContent(urlMapItem, urlMap, res);

    let view = 'pages/article';
    let availablePlatforms;
    let trainingCourseInfo;

    const pathUrl = req.originalUrl.split('?')[0];
    const queryHash = req.url.split('?')[1];
    const platformsConfig = await platforms.getPlatformsConfig(res);
    let preselectedPlatform;
    let canonicalUrl;
    cookiesPlatform = req.cookies['KCDOCS.preselectedLanguage'];

    if (content && content.length) {
        if (content[0].system.type === 'navigation_item' && content[0].subpages.value.length) {
            return `${pathUrl}/${content[0].subpages.value[0].url.value}${queryHash ? '?' + queryHash : ''}`;
        } else if (content[0].system.type === 'training_course') {
            view = 'pages/trainingCourse';
            res = fastly.preventCaching(res);
            trainingCourseInfo = await getTrainingCourseInfo(content[0], req, res);
        } else if (content[0].system.type === 'zapi_specification') {
            view = 'pages/redoc';
            let contentReference = await getRedocReference(content[0].system.codename, res, KCDetails);
            contentReference = resolveLinks(contentReference, urlMap);

            return {
                req: req,
                minify: minify,
                slug: slug,
                isPreview: KCDetails.isPreview,
                isReference: true,
                itemId: content && content.length ? content[0].system.id : null,
                title: content && content.length ? content[0].title.value : '',
                navigation: home && home.length ? home[0].navigation.value : null,
                footer: footer && footer.length ? footer[0] : null,
                UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
                platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
                helper: helper,
                content: contentReference,
                view: view
            };
        } else if (content[0].system.type === 'multiplatform_article' || content[0].system.type === 'article') {
            const preselectedPlatformSettings = await platforms.getPreselectedPlatform(content[0], cookiesPlatform, req, res);

            if (!preselectedPlatformSettings) {
                return null;
            }

            preselectedPlatform = preselectedPlatformSettings.preselectedPlatform;
            cookiesPlatform = preselectedPlatformSettings.cookiesPlatform;

            if (cookiesPlatform !== req.cookies['KCDOCS.preselectedLanguage']) {
                res.cookie('KCDOCS.preselectedLanguage', cookiesPlatform);
            }

            canonicalUrl = platforms.getCanonicalUrl(urlMap, content[0], preselectedPlatform);

            if (content[0].system.type === 'multiplatform_article') {
                const multiplatformArticleContent = await platforms.getMultiplatformArticleContent(content, preselectedPlatform, urlMap, KCDetails, res);

               if (!multiplatformArticleContent) {
                   return null;
               }

               content = multiplatformArticleContent.content;
               availablePlatforms = multiplatformArticleContent.availablePlatforms;
            }

            preselectedPlatform = platforms.getPreselectedPlatformByConfig(preselectedPlatform, platformsConfig);
        } else {
            return null;
        }
    } else {
        return null;
    }

    // If only article url slug in passed and item is present in the navigation, do not render the article
    const isExcludedNavigation = urlMap.filter(item => (item.codename === content[0].system.codename) && (item.url.startsWith('/other/'))).length > 0;
    if (!req.params.scenario && !req.params.topic && req.params.article && !isExcludedNavigation) {
        return null;
    }

    if (content && content.length) {
        const titleItems = [...articles, ...references];

        if (content[0].introduction) {
            content[0].introduction.value = helper.addTitlesToLinks(content[0].introduction.value, urlMap, titleItems);
        }

        if (content[0].description) {
            content[0].description.value = helper.addTitlesToLinks(content[0].description.value, urlMap, titleItems);
        }

        if (content[0].content) {
            content[0].content.value = helper.addTitlesToLinks(content[0].content.value, urlMap, titleItems);
        }

        if (content[0].next_steps) {
            content[0].next_steps.value = helper.addTitlesToLinks(content[0].next_steps.value, urlMap, titleItems);
        }
    }

    let containsChangelog;
    let containsTerminology;
    let containsTrainingCourse;
    let releaseNoteContentType;
    let trainingCourseContentType;
    if (content && content.length && content[0].content) {
        containsChangelog = helper.hasLinkedItemOfType(content[0].content, 'changelog');
        containsTerminology = helper.hasLinkedItemOfType(content[0].content, 'terminology');
        containsTrainingCourse = helper.hasLinkedItemOfType(content[0].content, 'training_course');

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

        content[0].content.value = await customRichTextResolver(content[0].content.value, req, res);
    }

    return {
        view: view,
        req: req,
        res: res,
        moment: moment,
        minify: minify,
        urlMap: urlMap,
        tempNewStructure: process.env.KK_NEW_STRUCTURE === 'true',
        slug: content && content.length ? content[0].url.value : '',
        isPreview: KCDetails.isPreview,
        projectId: res.locals.projectid,
        language: res.locals.language,
        itemId: content && content.length ? content[0].system.id : null,
        title: content && content.length ? content[0].title.value : '',
        description: content && content.length && content[0].introduction ? helper.stripTags(content[0].introduction.value).substring(0, 300) : '',
        platform: content && content.length && content[0].platform && content[0].platform.value.length ? await commonContent.normalizePlatforms(content[0].platform.value, res) : null,
        availablePlatforms: await commonContent.normalizePlatforms(availablePlatforms, res),
        selectedPlatform: platforms.getSelectedPlatform(platformsConfig, cookiesPlatform),
        canonicalUrl: canonicalUrl,
        introduction: content && content.length && content[0].introduction ? content[0].introduction.value : '',
        nextSteps: content && content.length && content[0].next_steps ? content[0].next_steps : '',
        navigation: home && home.length ? home[0].subpages.value : [],
        subNavigation: subNavigation && subNavigation.length ? subNavigation[0].subpages.value : [],
        content: content && content.length ? content[0] : null,
        footer: footer && footer.length ? footer[0] : null,
        UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
        platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
        termDefinitions: termDefinitions && termDefinitions.length ? termDefinitions : null,
        helper: helper,
        smartLink: KCDetails.isPreview ? smartLink : null,
        getFormValue: helper.getFormValue,
        preselectedPlatform: preselectedPlatform,
        containsChangelog: containsChangelog,
        releaseNoteContentType: releaseNoteContentType,
        containsTrainingCourse: containsTrainingCourse,
        trainingCourseContentType: trainingCourseContentType,
        trainingCourseInfo: trainingCourseInfo,
        hideAuthorLastModified: content && content.length && content[0].display_options ? helper.isCodenameInMultipleChoice(content[0].display_options.value, 'hide_metadata') : false,
        hideFeedback: content && content.length && content[0].display_options? helper.isCodenameInMultipleChoice(content[0].display_options.value, 'hide_feedback') : false
    };
};

router.get(['/other/:article', '/:main', '/:main/:scenario', '/:main/:scenario/:topic', '/:main/:scenario/:topic/:article'], asyncHandler(async (req, res, next) => {
    const data = await getContent(req, res, next);
    if (data && !data.view) return res.redirect(301, data);
    if (!data) return next();
    return res.render(data.view, data);
}));

module.exports = router;
