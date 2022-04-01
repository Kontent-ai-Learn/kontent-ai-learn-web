const cheerio = require('cheerio');
const resolveRichText = require('./richText');
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const isPreview = require('../kontent/isPreview');

const getConfig = (res) => {
    return {
        isPreview: isPreview(res.locals.previewapikey),
        projectid: res.locals.projectid,
        language: res.locals.language,
    }
};

const resolveChangelog = async ($, res) => {
    const $elem = $('#changelog-resolve');
    if (!$elem.length) return;

    const releaseNotes = await cacheHandle.evaluateSingle(res, 'releaseNotes', async () => {
        return await getContent.releaseNotes(res);
    });

    let html = '';

    for (let i = 0; i < releaseNotes.length; i++) {
        html += resolveRichText.releaseNote(releaseNotes[i], getConfig(res));
    }

    $elem.html(html);
};

const resolveTerminology = async ($, res) => {
    const $elem = $('#terminology-resolve');
    if (!$elem.length) return;

    const termDefinitions = await cacheHandle.evaluateSingle(res, 'termDefinitions', async () => {
        return await getContent.termDefinitions(res);
    });

    termDefinitions.sort((a, b) => a.term.value.localeCompare(b.term.value));

    let html = '';

    for (let i = 0; i < termDefinitions.length; i++) {
        html += resolveRichText.termDefinition(termDefinitions[i], getConfig(res));
    }

    $elem.html(html);
};

const customRichText = async (text, res) => {
    const $ = cheerio.load(text);

    await resolveChangelog($, res);
    await resolveTerminology($, res);

    const output = $.html();
    return output.replace('<html><head></head><body>', '').replace('</body></html>', '');
};

module.exports = customRichText;
