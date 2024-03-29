const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Europe/Prague');

const requestDelivery = require('../helpers/kontent/requestDelivery');
const postprocessMarkup = require('../helpers/resolve/postprocessMarkup');
const getContent = require('../helpers/kontent/getContent');
const helper = require('../helpers/general/helper');
const cacheHandle = require('../helpers/cache/handle');
const platforms = require('../helpers/general/platforms');
const resolveCustomRichText = require('../helpers/resolve/customRichText');
const smartLink = require('../helpers/kontent/smartLink');
const getUrlMap = require('../helpers/general/urlMap');
const elearningLandingPage = require('../helpers/e-learning/landingPage');

let cookiesPlatform;

const getItemContent = async (item, urlMap, res) => {
    const KCDetails = getContent.KCDetails(res);

    const settings = {
        type: item.type,
        codename: item.codename,
        depth: 4,
        ...KCDetails
    };

    if (item.type === 'navigation_item') {
        delete settings.depth;
    } else {
        settings.resolveRichText = true;
        settings.urlMap = urlMap;
    }

    const content = await cacheHandle.evaluateSingle(res, item.codename, async () => {
        return await requestDelivery(settings);
    });

    return content;
};

const getData = async (req, res) => {
    const KCDetails = getContent.KCDetails(res);

    const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });
    const home = await cacheHandle.ensureSingle(res, 'home', async () => {
        return await getContent.home(res);
    });

    let slug = req.originalUrl.split('/')[2];
    slug = slug.split('?')[0];
    const subnavCodename = helper.getCodenameByUrl(`/learn/${slug}/`, urlMap);

    let subNavigation;
    if (subnavCodename) {
        subNavigation = await cacheHandle.evaluateSingle(res, `subNavigation_${subnavCodename}`, async () => {
            return await getContent.subNavigation(res, subnavCodename);
        });
    }

    const footer = await cacheHandle.ensureSingle(res, 'footer', async () => {
        return await getContent.footer(res);
    });
    const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
        return await getContent.UIMessages(res);
    });
    const articles = await cacheHandle.ensureSingle(res, 'articles', async () => {
        return await getContent.articles(res);
    });
    const references = await cacheHandle.ensureSingle(res, 'apiSpecifications', async () => {
        return await getContent.references(res);
    });
    const termDefinitions = await cacheHandle.evaluateSingle(res, 'termDefinitions', async () => {
        return await getContent.termDefinitions(res);
    });

    const platformsConfigPairings = await getContent.platformsConfigPairings(res);

    let urlMapItem = helper.getMapItemByUrl(req.originalUrl, urlMap);
    let detailCodename;
    if (!urlMapItem) return null;
    if (urlMapItem.type === 'training_course2' || urlMapItem.type === 'training_certification_test') {
        const url = helper.removePathLastSegments(helper.getPathWithoutTrailingSlash(urlMapItem.url), 1);
        const urlMapItemTemp = helper.getMapItemByUrl(url, urlMap);
        if (urlMapItemTemp.type === 'landing_page') {
            detailCodename = urlMapItem.codename;
            urlMapItem = urlMapItemTemp;
        }
    }
    let content = await getItemContent(urlMapItem, urlMap, res);

    let view = 'pages/article';
    let availablePlatforms;

    const pathUrl = req.originalUrl.split('?')[0];
    const queryHash = req.url.split('?')[1];
    const platformsConfig = await platforms.getPlatformsConfig(res);
    let preselectedPlatform;
    let canonicalUrl;

    cookiesPlatform = req.cookies['KCDOCS.preselectedLanguage'];

    if (content && content.length) {
        if (content[0].system.type === 'navigation_item' && content[0].elements.subpages.linkedItems.length) {
            return {
                redirectCode: 301,
                redirectUrl: `${pathUrl}${content[0].elements.subpages.linkedItems[0].elements.url.value}/${queryHash ? `?${queryHash}` : ''}`
            }
        } else if (content[0].system.type === 'landing_page') {
            view = 'pages/landingPage';

            let detailCourse;
            const data = await elearningLandingPage.getData(content[0], res);
            if (detailCodename) {
                for (let i = 0; i < data.topics.length; i++) {
                    for (let j = 0; j < data.topics[i].courses.length; j++) {
                        if (data.topics[i].courses[j].system.codename === detailCodename) {
                            detailCourse = data.topics[i].courses[j];
                        }
                    }
                }
            }

            return {
                req: req,
                res: res,
                postprocessMarkup: postprocessMarkup,
                slug: slug,
                isLandingPage: true,
                isPreview: KCDetails.isPreview,
                itemId: content[0].system.id || null,
                detailCourse: detailCourse,
                pathRoot: urlMapItem.url,
                title: detailCourse ? detailCourse.elements.title.value : content[0]?.elements.page_title.value || '',
                pageHeading: content[0]?.elements.page_title.value || '',
                description: detailCourse ? helper.stripTags(detailCourse.elements.description.value).substring(0, 300) : '',
                content: data,
                navigation: home && home.length ? home[0].elements.subpages.linkedItems : null,
                footer: footer && footer.length ? footer[0] : null,
                UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
                platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
                helper: helper,
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
    const isExcludedNavigation = urlMap.filter(item => (item.codename === content[0].system.codename) && (item.url.startsWith('/learn/other/'))).length > 0;
    if (!req.params.scenario && !req.params.topic && req.params.article && !isExcludedNavigation) {
        return null;
    }

    let introduction;
    let body;
    let nextSteps;

    if (content && content.length) {
        const titleItems = [...articles, ...references];

        introduction = content[0]?.elements.introduction?.value;
        body = content[0]?.elements.content?.value;
        nextSteps = content[0]?.elements.next_steps?.value;

        if (introduction) {
            introduction = helper.addTitlesToLinks(introduction, urlMap, titleItems);

            if (req.query.pdf) {
                introduction = helper.resolvePdfImages(introduction);
            }
        }

        if (body) {
            body = helper.addTitlesToLinks(body, urlMap, titleItems);

            if (req.query.pdf) {
                body = helper.resolvePdfImages(body);
            }
        }

        if (nextSteps) {
            nextSteps = helper.addTitlesToLinks(nextSteps, urlMap, titleItems);

            if (req.query.pdf) {
                nextSteps = helper.resolvePdfImages(nextSteps);
            }
        }
    }

    let containsChangelog;
    let containsTerminology;
    let releaseNoteContentType;

    if (content && content.length && content[0].elements.content) {
        containsChangelog = helper.hasLinkedItemOfType(content[0].elements.content, 'changelog');
        containsTerminology = helper.hasLinkedItemOfType(content[0].elements.content, 'terminology');

        if (containsChangelog) {
            req.app.locals.changelogPath = helper.getPathWithoutQS(req.originalUrl);
            releaseNoteContentType = await cacheHandle.evaluateSingle(res, 'releaseNoteContentType', async () => {
                return await getContent.releaseNoteType(res);
            });
        }

        if (containsTerminology) {
            req.app.locals.terminologyPath = helper.getPathWithoutQS(req.originalUrl);
        }

        body = await resolveCustomRichText(body, res);
    }

    return {
        view: view,
        req: req,
        res: res,
        dayjs: dayjs,
        postprocessMarkup: postprocessMarkup,
        urlMap: urlMap,
        slug: content && content.length ? content[0].elements.url.value : '',
        isPreview: KCDetails.isPreview,
        projectId: res.locals.projectid,
        language: res.locals.language,
        itemId: content && content.length ? content[0].system.id : null,
        title: content && content.length ? content[0].elements.title.value : '',
        description: introduction ? helper.stripTags(introduction).substring(0, 300) : '',
        platform: content && content.length && content[0].elements.platform && content[0].elements.platform.value.length ? await getContent.normalizePlatforms(content[0].elements.platform.value, res) : null,
        availablePlatforms: await getContent.normalizePlatforms(availablePlatforms, res),
        selectedPlatform: platforms.getSelectedPlatform(platformsConfig, cookiesPlatform),
        canonicalUrl: canonicalUrl,
        introduction: introduction || '',
        nextSteps: nextSteps || '',
        navigation: home && home.length ? home[0].elements.subpages.linkedItems : [],
        subNavigation: subNavigation && subNavigation.length ? subNavigation[0].elements.subpages.linkedItems : [],
        content: content && content.length ? content[0] : null,
        body: body || '',
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
        hideAuthorLastModified: content && content.length && content[0].elements.display_options ? helper.isCodenameInMultipleChoice(content[0].elements.display_options.value, 'hide_metadata') : false,
        hideFeedback: content && content.length && content[0].elements.display_options? helper.isCodenameInMultipleChoice(content[0].elements.display_options.value, 'hide_feedback') : false,
        readingTime: content && content.length && content[0].elements.content ? helper.getReadingTime(content[0].elements.content.value) : null
    };
};

router.get(['/other/:article', '/:main', '/:main/:scenario', '/:main/:scenario/:topic', '/:main/:scenario/:topic/:article', '/:main/:scenario/:topic/:article/:subarticle'], asyncHandler(async (req, res, next) => {
    const data = await getData(req, res, next);
    if (data && data.redirectUrl && data.redirectCode) return res.redirect(data.redirectCode, data.redirectUrl);
    if (!data) return next();
    return res.render(data.view, data);
}));

module.exports = router;
