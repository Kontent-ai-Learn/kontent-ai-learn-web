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

const kontentSmartLinksResolveUndecided = ($) => {
    const $rel = $('[data-rel]');
    $rel.each(function() {
        const $that = $(this);
        const $undecided = $that.find('[data-kontent-undecided]').first();
        if (!$undecided.length) return;
        const id = $undecided.attr('data-kontent-undecided');
        const type = $that.attr('data-rel') === 'link' ? 'item' : 'component';
        if (type) {
            const smartLinkAttr = `data-kontent-${type}-id`;
            $undecided.attr(smartLinkAttr, id);
            $undecided.removeAttr('data-kontent-undecided');
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

const removeWrappingObjectTags = ($) => {
    const $objectElems = $('object[type="application/kenticocloud"] > *');
    $objectElems.unwrap();
};

const enhanceMarkup = (resolvedData, config) => {
    let text = resolvedData.value;
    // Substitute object tag with div as Cheerio does not operate with the object tag
    text = text.replace(/<object/g, '<div');
    text = text.replace(/<\/object/g, '</div');
    text = resolveMacros(text);
    const $ = cheerio.load(text);

    removeWrappingObjectTags($);
    replaceNodeWithItsContent($, 'p.kc-linked-item-wrapper, p:empty');
    setWidthToImages($);
    processLinks($, config);
    removeEmptyParagraph($);
    createAnchors($);
    replaceTooltipSpaces($);
    removeMacroLinkProtocol($);
    kontentSmartLinksResolveUndecided($);
    kontentSmartLinksRemoveInnerDataAttributes($);

    const output = $.html();
    return output.replace('<html><head></head><body>', '').replace('</body></html>', '');
};

module.exports = enhanceMarkup;
