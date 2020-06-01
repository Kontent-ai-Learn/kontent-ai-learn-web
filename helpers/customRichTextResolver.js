const cheerio = require('cheerio');
const commonContent = require('./commonContent');
const handleCache = require('./handleCache');
const richTextResolverTemplates = require('./richTextResolverTemplates');

const resolveChangelog = async ($, res) => {
    const $elem = $('#changelog-resolve');

    if (!$elem.length) return;

    const releaseNotes = await handleCache.evaluateSingle(res, 'releaseNotes', async () => {
        return await commonContent.getReleaseNotes(res);
    });

    let html = '';

    for (let i = 0; i < releaseNotes.length; i++) {
        html += richTextResolverTemplates.releaseNote(releaseNotes[i]);
    }

    $elem.html(html);
};

const resolveTerminology = async ($, res) => {
    const $elem = $('#terminology-resolve');

    if (!$elem.length) return;

    const termDefinitions = await handleCache.evaluateSingle(res, 'termDefinitions', async () => {
        return await commonContent.getTermDefinitions(res);
    });

    let html = '';

    for (let i = 0; i < termDefinitions.length; i++) {
        html += richTextResolverTemplates.termDefinition(termDefinitions[i]);
    }

    $elem.html(html);
};

const customRichTextResolver = async (text, res) => {
    const $ = cheerio.load(text);

    await resolveChangelog($, res);
    await resolveTerminology($, res);

    const output = $.html();
    return output.replace('<html><head></head><body>', '').replace('</body></html>', '');
};

module.exports = customRichTextResolver;
