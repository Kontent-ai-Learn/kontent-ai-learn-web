const cheerio = require('cheerio');
const { generateAnchor, resolveMacros } = require('../general/helper');

// !!!!! Keep using the "function" keyword in the ".each" callback instead of arrow function

const replaceNodeWithItsContent = ($, selector) => {
    $(selector).each(function() {
        const contents = $(this).contents();
        $(this).replaceWith(contents);
    });
};

const replaceTooltipSpaces = ($) => {
    $('a[href^="#term-definition-"]').each(function() {
        const $that = $(this);
        $that.html($that.html().replace(/\s/g, '&nbsp;'));
    });
};

const setWidthToImages = ($) => {
    $('img[data-asset-id]').each(function() {
        const $that = $(this);
        const src = $that.attr('src');
        if (src && !src.endsWith('.gif')) {
            $that.attr('src', `${src}?w=926&fm=pjpg&auto=format`);
        }
    });
};

const removeEmptyParagraph = ($) => {
    $('p:empty').remove();
};

const processLinks = ($, config) => {
    $('a[data-item-id][href=""]').each(function () {
        const $that = $(this);
        $that.removeAttr('data-item-id');
        $that.attr('href', '/learn/page-not-found');
    });
    $('a[target="_blank"]:not([data-lightbox-embed]):not(.edit-link)').each(function () {
        $(this).addClass('a-blank');
    });
    $('a[href*="tech={tech}"]').each(function () {
        const $that = $(this);
        $that.attr('rel', 'nofollow');
    });
    $('a').each(function () {
        const $that = $(this);
        let text = $that.html();
        const found = text.match(/{#[^#]+#}/);
        if (!found) return;
        const macro = found[0];
        const anchor = macro.replace('{#', '').replace('#}', '');
        text = text.replace(macro, '').trim();
        const href = $that.attr('href');
        $that.attr('href', `${href}#${anchor}`);
        $that.html(text);
    });
};

const createAnchors = ($) => {
    const $headings = $('h2:not(.table-of-contents__heading):not(.feedback__heading):not(.presentation__heading), h3, h4');
    const anchorNameList = [];

    $headings.each(function () {
        const $that = $(this);
        const anchorName = generateAnchor($that.html());
        anchorNameList.push(anchorName);
        let anchorNameCount = 0;
        anchorNameList.forEach((name) => {
            if (name === anchorName) {
                anchorNameCount += 1;
            }
        });

        const id = `a-${anchorName}${anchorNameCount > 1 ? `-${anchorNameCount}` : ''}`;
        $that.attr('id', id);
        $that.html(`<a href="#${id}" class="anchor-copy" aria-hidden="true"></a>${$that.html()}`);
    });
};

const tryGetKontentSmartLinkTypeInner = ($elem, codename) => {
    const $innerDefinitionElem = $elem.parents('[data-kk-codenames]');
    if (!$innerDefinitionElem.length) return;

    const codenames = $innerDefinitionElem.attr('data-kk-codenames').split('|');
    const rels = $innerDefinitionElem.attr('data-kk-rels').split('|');

    const index = codenames.indexOf(codename);
    const type = rels[index];

    if (type === 'link') {
        return 'item';
    }

    return 'component';
};

const kontentSmartLinksResolveUndecided = ($, resolvedData) => {
    const $undecided = $('[data-kontent-undecided]');
    $undecided.each(function() {
        const $that = $(this);
        const attr = $that.attr('data-kontent-undecided').split('|');
        const id = attr[0];
        const codename = attr[1];
        let type = '';

        resolvedData.linkedItemCodenames.forEach((item) => {
            if (item === codename) {
                type = 'item';
            }
        });

        resolvedData.componentCodenames.forEach((item) => {
            if (item === codename) {
                type = 'component';
            }
        });

        if (!type) {
            type = tryGetKontentSmartLinkTypeInner($that, codename);
        }

        if (type) {
            const smartLinkAttr = `data-kontent-${type}-id`;
            $that.attr(smartLinkAttr, id);
            $that.removeAttr('data-kontent-undecided');
        }
    });
};

const kontentSmartLinksRemoveInnerDataAttributes = ($) => {
    const $innerDefinitionElem = $('[data-kk-codenames]');

    $innerDefinitionElem.removeAttr('data-kk-codenames');
    $innerDefinitionElem.removeAttr('data-kk-rels');
};

const removeMacroLinkProtocol = ($) => {
    const $links = $('[href^="http://{"], [href^="https://{"]');

    $links.each(function () {
        const $that = $(this);
        const url = $that.attr('href').replace(/^http[s]?:\/\//, '');
        $that.attr('href', url);
    });
};

const enhanceMarkup = (resolvedData, config) => {
    let text = resolvedData.html;
    text = resolveMacros(text);
    const $ = cheerio.load(text);

    replaceNodeWithItsContent($, 'p.kc-linked-item-wrapper, p:empty');
    setWidthToImages($);
    processLinks($, config);
    removeEmptyParagraph($);
    createAnchors($);
    replaceTooltipSpaces($);
    removeMacroLinkProtocol($);
    kontentSmartLinksResolveUndecided($, resolvedData);
    kontentSmartLinksRemoveInnerDataAttributes($);

    const output = $.html();
    return output.replace('<html><head></head><body>', '').replace('</body></html>', '');
};

module.exports = enhanceMarkup;
