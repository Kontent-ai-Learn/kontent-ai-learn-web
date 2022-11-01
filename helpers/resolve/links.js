const getQueryString = (type) => {
    let qs = '';
    if (type === 'multiplatform_article') {
        qs = '?tech={tech}';
    }
    return qs;
};

const resolveLink = (link, config) => {
    if (!link) return '';
    let resolvedUrl = '';

    if (config.urlMap) {
        resolvedUrl = config.urlMap.filter((elem) => elem.codename === link.codename);
    }

    if (resolvedUrl.length > 0) {
        resolvedUrl = `${resolvedUrl[0].url}${getQueryString(resolvedUrl[0].type)}`;
    } else if (link.type === 'term_definition') {
        resolvedUrl = `#term-definition-${link.codename}`;
    } else {
        resolvedUrl = '/learn/page-not-found';
    }

    return resolvedUrl;
}

module.exports = {
    resolveLink
};
