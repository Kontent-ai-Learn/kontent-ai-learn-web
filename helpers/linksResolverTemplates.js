const cheerio = require('cheerio');
const helpers = require('./helperFunctions');

const updateLinkAttribute = (element, resolvedUrl, link) => {
    const $ = cheerio.load(element.value);
    $(`a[data-item-id="${link.linkId}"]`).each((index, item) => {
        const $item = $(item);
        $item.removeAttr('data-item-id');
        $item.attr('href', resolvedUrl);

        if (resolvedUrl.indexOf('tech={tech}') > -1) {
            $item.attr('rel', 'nofollow');
        }
    });
    element.value = $.html();
    element.value = element.value.replace('<html><head></head><body>', '').replace('</body></html>', '');
};

const getQueryString = (type) => {
    let qs = '';
    if (type === 'multiplatform_article') {
        qs = '?tech={tech}';
    }
    return qs;
};

const resolveLinkUrlsInElement = (element, config) => {
    element.links.forEach((link) => {
        let resolvedUrl = [];

        if (config.urlMap) {
            resolvedUrl = config.urlMap.filter(elem => elem.codename === link.codename);
        }

        if (resolvedUrl.length > 0) {
            resolvedUrl = `${config.urlPathPrefix}${resolvedUrl[0].url}${getQueryString(resolvedUrl[0].type)}`;
        } else if (link.type === 'term_definition') {
            resolvedUrl = `#term-definition-${link.codename}`;
        } else {
            resolvedUrl = `${config.urlPathPrefix}/page-not-found`;
        }

        if (element.value && resolvedUrl) {
            updateLinkAttribute(element, resolvedUrl, link)
        }
    });
};

const linksResolverTemplates = {
    resolve: (item, config) => {
        let url = [];

        if (config.urlMap) {
            url = config.urlMap.filter(elem => elem.codename === item.codename);
        }

        if (url.length > 0) {
            return `${config.urlPathPrefix}${url[0].url}${getQueryString(url[0].type)}`;
        } else if (item.type === 'term_definition') {
            return `#term-definition-${item.codename}`;
        } else {
            return `${config.urlPathPrefix}/page-not-found`;
        }
    },
    resolveInnerRichTextLinks: (item, config) => {
        const keys = helpers.removeUnderscoreElems(Object.keys(item));
        keys
            .filter((key) =>
                Object.prototype.hasOwnProperty.call(item, key) &&
                Object.prototype.hasOwnProperty.call(item[key], 'type') &&
                Object.prototype.hasOwnProperty.call(item[key], 'links') &&
                item[key].type === 'rich_text')
            .forEach((key) => resolveLinkUrlsInElement(item[key], config));

        return item;
    }
};

module.exports = linksResolverTemplates;
