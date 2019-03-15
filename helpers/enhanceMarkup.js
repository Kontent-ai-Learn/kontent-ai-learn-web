const cheerio = require('cheerio');

const enhanceMarkup = (text) => {
    const $ = cheerio.load(text);

    replaceNodeWithItsContent($, 'p.kc-linked-item-wrapper, p:empty');
    setWidthToImages($);
    processLinks($);

    let output = $.html();
    return output.replace('<html><head></head><body>', '').replace('</body></html>', '');
};

const replaceNodeWithItsContent = ($, selector) => {
    $(selector).each(function(i, elem) {
        var contents = $(this).contents();
        $(this).replaceWith(contents);
    });
};

const setWidthToImages = ($) => {
    $('img[data-asset-id]').each(function(i, elem) {
        var $that = $(this);
        if (!$that.attr('src').endsWith('.gif')) {
            $that.attr('src', $that.attr('src') + '?w=926');
        }
    });
};

const processLinks = ($) => {
    $(`a[data-item-id][href=""]`).each(function(i, elem) {
        var $that = $(this);
        $that.removeAttr('data-item-id');
        $that.attr('href', '/page-not-found');
    });
};

module.exports = enhanceMarkup;
