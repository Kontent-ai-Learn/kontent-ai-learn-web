const cheerio = require('cheerio');
const commonContent = require('./commonContent');
const handleCache = require('./handleCache');
const richTextResolverTemplates = require('./richTextResolverTemplates');
const isPreview = require('./isPreview');

const resolveChangelog = async ($, req, res) => {
    const $elem = $('#changelog-resolve');
    const config = {
        isPreview: isPreview(res.locals.previewapikey),
        projectid: res.locals.projectid,
        language: res.locals.language
    };

    if (!$elem.length) return;

    const releaseNotes = await handleCache.evaluateSingle(res, 'releaseNotes', async () => {
        return await commonContent.getReleaseNotes(res);
    });

    let html = '';

    for (let i = 0; i < releaseNotes.length; i++) {
        html += richTextResolverTemplates.releaseNote(releaseNotes[i], config);
    }

    $elem.html(html);
};

const resolveTerminology = async ($, req, res) => {
    const $elem = $('#terminology-resolve');
    const config = {
        isPreview: isPreview(res.locals.previewapikey),
        projectid: res.locals.projectid,
        language: res.locals.language
    };

    if (!$elem.length) return;

    const termDefinitions = await handleCache.evaluateSingle(res, 'termDefinitions', async () => {
        return await commonContent.getTermDefinitions(res);
    });

    let html = '';

    for (let i = 0; i < termDefinitions.length; i++) {
        html += richTextResolverTemplates.termDefinition(termDefinitions[i], config);
    }

    $elem.html(html);
};

const customRichTextResolver = async (text, req, res) => {
    const $ = cheerio.load(text);

    await resolveChangelog($, req, res);
    await resolveTerminology($, req, res);

    const output = $.html();
    return output.replace('<html><head></head><body>', '').replace('</body></html>', '');
};

module.exports = customRichTextResolver;
