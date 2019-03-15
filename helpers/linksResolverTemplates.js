const cheerio = require('cheerio');

const linksResolverTemplates = {
    resolve: (item, urlMap) => {
        let url = urlMap.filter(elem => elem.codename === item.codename);

        if (url.length > 0) {
            return url[0].url;
        } else if (item.type === 'article') {
            return `/other/${item.urlSlug}`;
        } else {
            return '/page-not-found';
        }
    },
    resolveInnerRichTextLinks: (item, urlMap) => {
        Object.keys(item)
            .filter((key) =>
                item.hasOwnProperty(key) &&
                item[key].hasOwnProperty('type') &&
                item[key].hasOwnProperty('links') &&
                item[key].type === `rich_text`)
            .forEach((key) => resolveLinkUrlsInElement(item[key], item, urlMap));

        return item;
    }
};

const resolveLinkUrlsInElement = (element, item, urlMap) => {
    element.links.forEach((link) => {
        let resolvedUrl = urlMap.filter(elem => elem.codename === link.codename);
        if (resolvedUrl.length > 0) {
            resolvedUrl = resolvedUrl[0].url;
        } else if (link.type === 'article') {
            resolvedUrl = `/other/${item.urlSlug}`;
        } else {
            resolvedUrl = '/page-not-found';
        }
        if (element.value && resolvedUrl) {
            updateLinkAttribute(element, resolvedUrl, link)
        }
    });
};

const updateLinkAttribute = (element, resolvedUrl, link) => {
    const $ = cheerio.load(element.value);
    $(`a[data-item-id="${link.itemId}"]`).each(function (i, elem) {
        var $that = $(this);
        $that.removeAttr('data-item-id');
        $that.attr('href', resolvedUrl);
    });
    element.value = $.html();
    element.value = element.value.replace('<html><head></head><body>', '').replace('</body></html>', '');
};

module.exports = linksResolverTemplates;
