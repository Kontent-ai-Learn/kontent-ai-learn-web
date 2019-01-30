const cheerio = require('cheerio');

const stripWrapperPLinkedElements = (text) => {
    const $ = cheerio.load(text);

    $('p.kc-linked-item-wrapper, p:empty').each(function(i,elem) {
        var contents = $(this).contents();
        $(this).replaceWith(contents);
    });

    let output = $.html();
    return output.replace('<html><head></head><body>', '').replace('</body></html>', '');
};

module.exports = stripWrapperPLinkedElements;