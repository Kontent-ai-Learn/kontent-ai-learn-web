const moment = require('moment');
const cheerio = require('cheerio');
const helper = require('./helperFunctions');
const smartLink = require('./smartLink');

const getSmartLinkAttr = (config, id, type, codename) => {
    if (!config.isPreview) return '';

    let smartLinkObj = null;
    if (type === 'element') {
        smartLinkObj = config.isPreview ? smartLink.elementCodename(id) : null;
    } else if (type === 'component') {
        smartLinkObj = config.isPreview ? smartLink.componentId(id) : null;
    } else if (type === 'item') {
        smartLinkObj = config.isPreview ? smartLink.itemId(id) : null;
    } else if (type === 'undecided') {
        smartLinkObj = config.isPreview ? smartLink.undecided(`${id}|${codename}`) : null;
    }
    return smartLinkObj ? ` ${Object.keys(smartLinkObj)[0]}="${smartLinkObj[Object.keys(smartLinkObj)[0]]}"` : '';
};

const getSmartLinkAttrInner = (markup, config) => {
    if (!config.isPreview) return '';
    const $ = cheerio.load(markup);
    const rels = [];
    const codenames = [];
    const $unresolvedObjects = $('object[type="application/kenticocloud"]');

    $unresolvedObjects.each(function () {
        const $that = $(this);
        rels.push($that.attr('data-rel'));
        codenames.push($that.attr('data-codename'));
    })

    return ` data-kk-rels="${rels.join('|')}" data-kk-codenames="${codenames.join('|')}"`;
};

const getImageAttributes = (item, cssClass, transformationQueryString) => {
    if (item.image_width.value.length) {
        switch (item.image_width.value[0].codename) {
            case 'n25_':
                cssClass += ' article__image--25';
                transformationQueryString += '168';
                break;
            case 'n50_':
                cssClass += ' article__image--50';
                transformationQueryString += '336';
                break;
            case 'n75_':
                cssClass += ' article__image--75';
                transformationQueryString += '504';
                break;
            case 'n100_':
                cssClass += ' article__image--100';
                transformationQueryString += '672';
                break;
            default:
                transformationQueryString += '896';
        }
    }

    if (item.image.value.length && item.image.value[0].url.endsWith('.gif')) {
        transformationQueryString = '?fm=mp4';
    }

    return {
        cssClass: cssClass,
        transformationQueryString: transformationQueryString
    }
}

const getYoutubeTemplate = (cssClass, item, config) => {
    return `
        ${config.isPreview ? `<div$${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed${cssClass}">
            <iframe class="lazy" width="560" height="315" data-src="https://www.youtube-nocookie.com/embed/${item.id.value}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>
            <noscript>
                <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/${item.id.value}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>
            </noscript>
        </div>
        ${helper.isNotEmptyRichText(item.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.caption.value, config)}>${item.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>Play video on <a href="https://www.youtube.com/watch?v=${item.id.value}"> https://www.youtube.com/watch?v=${item.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getCodepenTemplate = (cssClass, item, config) => {
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}>` : ''}
        <div class="embed${cssClass}">
            <iframe class="lazy" height="265" scrolling="no" data-src="https://codepen.io/${item.id.value.replace('/pen/', '/embed/')}/?height=265&amp;theme-id=0" frameborder="no" allowtransparency="true" allowfullscreen="true"${getSmartLinkAttr(config, 'id', 'element')}></iframe>
            <noscript>
                <iframe height="265" scrolling="no" src="https://codepen.io/${item.id.value}/?height=265&amp;theme-id=0" frameborder="no" allowtransparency="true" allowfullscreen="true"${getSmartLinkAttr(config, 'id', 'element')}></iframe>
            </noscript>
        </div>
        ${helper.isNotEmptyRichText(item.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.caption.value, config)}>${item.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the code example on <a href="https://codepen.io/${item.id.value}">https://codepen.io/${item.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getStackblitzTemplate = (cssClass, item, config) => {
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed${cssClass}">
            <iframe class="lazy" data-src="https://stackblitz.com/edit/${item.id.value}?embed=1"></iframe>
            <noscript>
                <iframe src="https://stackblitz.com/edit/${item.id.value}?embed=1"></iframe>
            </noscript>
        </div>
        ${helper.isNotEmptyRichText(item.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.caption.value, config)}>${item.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the code example on <a href="https://stackblitz.com/edit/${item.id.value}">https://stackblitz.com/edit/${item.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getCodesandboxTemplate = (cssClass, item, config) => {
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed${cssClass}">
            <iframe class="lazy" data-src="https://codesandbox.io/embed/${item.id.value}"></iframe>
            <noscript>
                <iframe src="https://codesandbox.io/embed/${item.id.value}"></iframe>
            </noscript>
        </div>
        ${helper.isNotEmptyRichText(item.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.caption.value, config)}>${item.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the code example on <a href="https://codesandbox.io/s/${item.id.value}">https://codesandbox.io/s/${item.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getNetlifyTemplate = (cssClass, item, config, netlifyId) => {
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed${cssClass}">
            <iframe class="lazy lazy--exclude-dnt" data-src="https://${netlifyId[0]}.netlify.com/${netlifyId[1]}"></iframe>
            <noscript>
                <iframe src="https://${netlifyId[0]}.netlify.com${netlifyId[1]}"></iframe>
            </noscript>
        </div>
        ${helper.isNotEmptyRichText(item.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.caption.value, config)}>${item.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the example on <a href="https://${netlifyId[0]}.netlify.com${netlifyId[1]}">https://${netlifyId[0]}.netlify.com${netlifyId[1]}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getGiphyTemplate = (cssClass, item, config) => {
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed embed--giphy${cssClass}">
            <iframe class="lazy" data-src="https://giphy.com/embed/${item.id.value}"></iframe>
            <div class="embed__overlay" aria-hidden="true"></div>
            <noscript>
                <iframe src="https://giphy.com/embed/${item.id.value}"></iframe>
            </noscript>
            <a class="embed__link" href="https://giphy.com/gifs/${item.id.value}" target="_blank">via GIPHY</a>
        </div>
        ${helper.isNotEmptyRichText(item.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.caption.value, config)}>${item.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the image on <a href="https://giphy.com/embed/${item.id.value}">https://giphy.com/embed/${item.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getDiagramsnetTemplate = (cssClass, item, config, elemId) => {
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed embed--diagrams-net${cssClass}" id="embed-${elemId}">
            <iframe width="2000" height="1125" class="lazy" frameborder="0" data-src="https://viewer.diagrams.net?lightbox=1&nav=1#${item.id.value}"></iframe>
            <a data-lightbox-embed="embed-${elemId}" target="_blank" href="https://viewer.diagrams.net?lightbox=1&nav=1#${item.id.value}" class="embed__overlay" aria-hidden="true" data-overlay-text="Zoom diagram"></a>
            <noscript>
                <iframe frameborder="0" src="https://viewer.diagrams.net?lightbox=1&nav=1#${item.id.value}"></iframe>
            </noscript>
        </div>
        ${helper.isNotEmptyRichText(item.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.caption.value, config)}>${item.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the diagram on <a href="https://viewer.diagrams.net?lightbox=1&nav=1#${item.id.value}">https://viewer.diagrams.net?lightbox=1&nav=1#${item.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getEmbeddedTemplate = (cssClass, item, config, netlifyId) => {
    const elemId = `${item.provider.value[0].codename}-${Math.floor(Math.random() * 9999999) + 1}`;
    return {
        youtube: getYoutubeTemplate(cssClass, item, config),
        codepen: getCodepenTemplate(cssClass, item, config),
        stackblitz: getStackblitzTemplate(cssClass, item, config),
        codesandbox: getCodesandboxTemplate(cssClass, item, config),
        netlify: getNetlifyTemplate(cssClass, item, config, netlifyId),
        giphy: getGiphyTemplate(cssClass, item, config),
        diagrams_net: getDiagramsnetTemplate(cssClass, item, config, elemId)
    }
};

const richTextResolverTemplates = {
    embeddedContent: (item, config) => {
        let cssClass = '';
        let netlifyId = '';

        if (item.width.value.length) {
            switch (item.width.value[0].codename) {
                case 'n50_':
                    cssClass += ' embed--50';
                    break;
                case 'n75_':
                    cssClass += ' embed--75';
                    break;
                case 'n100_':
                    cssClass += ' embed--100';
                    break;
                default:
                    cssClass += '';
            }
        }

        if (item.provider.value.length && item.provider.value[0].codename === 'netlify') {
            netlifyId = item.id.value.trim().split(';');

            if (!netlifyId[1]) {
                netlifyId[1] = '';
            }
        }

        if (item.provider.value.length) {
            const templates = getEmbeddedTemplate(cssClass, item, config, netlifyId);
            return templates[item.provider.value[0].codename] || '';
        }

        return '';
    },
    signpost: (item, config) => {
        let type = '';
        let listClass = '';
        let itemsToShow = -1;
        const missingTitle = (item.title.value === '' || item.title.value === '<p><br></p>');
        const missingDescription = (item.description.value === '' || item.description.value === '<p><br></p>');

        if (item.type.value.length) type = item.type.value[0].codename;
        if (type === 'platform_selection') listClass = ' selection--platforms';
        if (item.items_to_show.value) itemsToShow = parseInt(item.items_to_show.value);

        return `
            <section class="presentation__section${missingTitle && missingDescription ? ' presentation__section--list-only' : ''}"${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}>
                ${!missingTitle ? `<h2 class="presentation__heading"${getSmartLinkAttr(config, 'title', 'element')}>${item.title.value}</h2>` : ''}
                ${!missingDescription ? `<span class="presentation__sub-heading"${getSmartLinkAttr(config, 'description', 'element')}>${item.description.value}</span>` : ''}
                <ul class="selection${listClass}" data-items-to-show="${!isNaN(itemsToShow) && itemsToShow > -1 ? itemsToShow : -1}"${getSmartLinkAttr(config, 'content', 'element')}${getSmartLinkAttrInner(item.content.value, config)}>
                    ${item.content.value}
                </ul>
            </section>
        `;
    },
    signpostItem: (item, config) => {
        const urlMap = config.urlMap;
        let resolvedUrl = '/page-not-found';
        const imageWidth = item.image.value[0] ? item.image.value[0].width || 0 : 0;
        const imageHeight = item.image.value[0] ? item.image.value[0].height || 0 : 0;
        const placeholderSrc = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="${imageWidth}" height="${imageHeight}"></svg>`;
        const imageSrc = item.image.value[0] ? `${item.image.value[0].url}?w=290&fm=pjpg&auto=format` : '';
        let target = 'self';
        if (item.link__link_to_content_item.value[0] && urlMap) {
            const matchUrlMapItem = urlMap.filter(elem => elem.codename === item.link__link_to_content_item.value[0].system.codename);

            if (matchUrlMapItem.length) {
                resolvedUrl = matchUrlMapItem[0].url;

                if (matchUrlMapItem[0].type === 'multiplatform_article') {
                    resolvedUrl += '?tech={tech}';
                }
            }
        }

        if (item.link__link_to_web_url.value) {
            target = 'blank';
            resolvedUrl = item.link__link_to_web_url.value;
        }

        return `
            <li class="selection__item"${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}>
                <div class="selection__link">
                    <a target="_${target}" class="selection__a" href="${resolvedUrl}"${resolvedUrl.indexOf('tech={tech}') > -1 ? ' rel="nofollow"' : ''}>
                        ${item.title.value ? `<div class="sr-only">${item.title.value}</div>` : ''}
                    </a>
                    ${item.image.value[0]
? `
                        <div class="selection__img-sizer"${getSmartLinkAttr(config, 'image', 'element')}>
                            <img class="selection__img lazy lazy--exclude-dnt" data-dpr data-lazy-onload src='${placeholderSrc}' data-src="${imageSrc}"${imageWidth && imageHeight ? `width="${imageWidth}" height="${imageHeight}"` : ''}>
                            <noscript>
                                <img class="selection__img" src="${imageSrc}">
                            </noscript>
                        </div> 
                    `
: ''}
                    ${item.title.value ? `<div class="selection__title"${getSmartLinkAttr(config, 'title', 'element')}>${item.title.value}</div>` : ''}
                    ${helper.isNotEmptyRichText(item.description.value) ? `<div class="selection__description"${getSmartLinkAttr(config, 'description', 'element')}${getSmartLinkAttrInner(item.description.value, config)}>${item.description.value}</div>` : ''}
                </div>
            </li>
        `;
    },
    homeLinkToContentItem: (item, config) => {
        const urlMap = config.urlMap;
        let resolvedUrl = '';
        const imageWidth = item.image.value[0] ? item.image.value[0].width || 0 : 0;
        const imageHeight = item.image.value[0] ? item.image.value[0].height || 0 : 0;
        const placeholderSrc = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="${imageWidth}" height="${imageHeight}"></svg>`;
        const imageSrc = item.image.value[0] ? `${item.image.value[0].url}?w=290&fm=pjpg&auto=format` : 'https://plchldr.co/i/290x168?&amp;bg=ededed&amp;text=Image';

        if (item.linked_item.value[0] && urlMap) {
            const matchUrlMapItem = urlMap.filter(elem => elem.codename === item.link__link_to_content_item.value[0].system.codename);
            if (matchUrlMapItem.length) {
                resolvedUrl = matchUrlMapItem[0].url;

                if (matchUrlMapItem[0].type === 'multiplatform_article') {
                    resolvedUrl += '?tech={tech}';
                }
            }
        }

        return `
            <li class="selection__item"${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}>
                ${resolvedUrl ? `<a class="selection__link" href="${resolvedUrl}"${resolvedUrl.indexOf('tech={tech}') > -1 ? ' rel="nofollow"' : ''}>` : '<div class="selection__link">'}
                    <div class="selection__img-sizer">
                        <img class="selection__img lazy lazy--exclude-dnt" data-dpr data-lazy-onload loading="lazy" src='${placeholderSrc}' data-src="${imageSrc}"${imageWidth && imageHeight ? ` width="${imageWidth}" height="${imageHeight}"` : ''}${getSmartLinkAttr(config, 'image', 'element')}>
                        <noscript>
                            <img class="selection__img" src="${imageSrc}"${getSmartLinkAttr(config, 'image', 'element')}>
                        </noscript>
                    </div>
                    <div class="selection__title"${getSmartLinkAttr(config, 'title', 'element')}>${item.title.value}</div>
                ${resolvedUrl ? '</a>' : '</div>'}
            </li>
        `;
    },
    callout: (item, config) => {
        return `
            <div class="callout callout--${item.type.value.length ? item.type.value[0].codename : ''}"${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}>
                <div${getSmartLinkAttr(config, 'content', 'element')}${getSmartLinkAttrInner(item.content.value, config)}>${item.content.value}</div>
            </div>`;
    },
    image: (item, config) => {
        if (item.image.value.length) {
            const alt = item.image.value[0].description ? helper.escapeQuotesHtml(item.image.value[0].description) : '';
            const url = item.url.value.trim();
            const transformationQueryString = '?fm=pjpg&auto=format&w=';
            const zoomable = item.zoomable.value.length && item.zoomable.value[0].codename === 'true';
            let cssClass = ' article__image-border'; // Always show border
            cssClass += zoomable && !url ? ' article__add-lightbox' : '';
            const imageWidth = item.image.value[0] ? item.image.value[0].width || 0 : 0;
            const imageHeight = item.image.value[0] ? item.image.value[0].height || 0 : 0;
            const openLinkTag = url ? `<a href="${url}" target="_blank" class="no-icon"${getSmartLinkAttr(config, 'url', 'element')}>` : '';
            const closeLinkTag = url ? '</a>' : '';
            const placeholderSrc = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="${item.image.value[0].width}" height="${item.image.value[0].height}"></svg>`;
            const attributes = getImageAttributes(item, cssClass, transformationQueryString);

            if (item.image.value[0].url.endsWith('.gif')) {
                return `
                    <figure${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}>
                        <div class="video-controls"${zoomable && !url ? ' data-lightbox-video' : ''}${url ? ` data-video-url="${url}"` : ''}>
                            <video class="article__image article__image--video lazy lazy--exclude-dnt ${attributes.cssClass}" preload="none" muted playsinline${imageWidth && imageHeight ? ` width="${imageWidth}" height="${imageHeight}"` : ''}${getSmartLinkAttr(config, 'image', 'element')}>
                                <source src="${item.image.value[0].url}${attributes.transformationQueryString}" type="video/mp4">
                            </video>
                        </div>
                        <div class="print-only"> 
                            <img class="article__image ${attributes.cssClass}"${imageWidth && imageHeight ? ` width="${imageWidth}" height="${imageHeight}"` : ''} alt="${alt}" data-src="${item.image.value[0].url}">
                        </div>
                        ${helper.isNotEmptyRichText(item.description.value) ? `<figcaption${getSmartLinkAttr(config, 'description', 'element')}${getSmartLinkAttrInner(item.description.value, config)}>${item.description.value}</figcaption>` : ''}
                    </figure>`;
            }

            return `
                <figure${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}>
                    ${openLinkTag}
                        <img class="article__image lazy lazy--exclude-dnt ${attributes.cssClass}" alt="${alt}" data-dpr data-lazy-onload loading="lazy" src='${placeholderSrc}' data-src="${item.image.value[0].url}${attributes.transformationQueryString}"${imageWidth && imageHeight ? ` width="${imageWidth}" height="${imageHeight}"` : ''}${getSmartLinkAttr(config, 'image', 'element')}${zoomable && !url ? ' data-lightbox-image' : ''}>
                    ${closeLinkTag}
                    <noscript>
                        ${openLinkTag}
                            <img class="article__image ${attributes.cssClass}" alt="${alt}" src="${item.image.value[0].url}${attributes.transformationQueryString}"${getSmartLinkAttr(config, 'image', 'element')}>
                        ${closeLinkTag}
                    </noscript>
                    ${helper.isNotEmptyRichText(item.description.value) ? `<figcaption${getSmartLinkAttr(config, 'description', 'element')}${getSmartLinkAttrInner(item.description.value, config)}>${item.description.value}</figcaption>` : ''}
                </figure>`;
        }

        return '';
    },
    callToAction: (item, config) => {
        const action = item.action.value.length ? item.action.value[0].codename : null;
        const smartLinkComponentAttr = getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename);
        const smartLinkAttr = getSmartLinkAttr(config, 'text', 'element');

        if (action === 'show_intercom') {
            return `<div class="call-to-action" data-click="support"${smartLinkComponentAttr}${smartLinkAttr}><span>${item.text.value}</span><span></span></div>`;
        }

        if (action === 'enable_embed') {
            return `<div class="call-to-action"${smartLinkComponentAttr}${smartLinkAttr}><span>${item.text.value}</span><span></span></div>`;
        }

        const urlMap = config.urlMap;
        let resolvedUrl = '';

        if (item.link__link_to_content_item.value[0] && urlMap) {
            const matchUrlMapItem = urlMap.filter(elem => elem.codename === item.link__link_to_content_item.value[0].system.codename);
            if (matchUrlMapItem.length) {
                resolvedUrl = matchUrlMapItem[0].url;

                if (matchUrlMapItem[0].type === 'multiplatform_article') {
                    resolvedUrl += '?tech={tech}';
                }
            }
        }

        if (item.link__link_to_web_url.value) {
            resolvedUrl = item.link__link_to_web_url.value;
        }

        if (!resolvedUrl) {
            resolvedUrl = '/page-not-found';
        }

        return `<a href="${resolvedUrl}" class="call-to-action"${resolvedUrl.indexOf('tech={tech}') > -1 ? ' rel="nofollow"' : ''}${smartLinkComponentAttr}${smartLinkAttr}><span>${item.text.value}</span><span></span></a>`;
    },
    contentChunk: (item, config) => {
        const platforms = [];
        let value = item.content.value;
        item.platform.value.forEach(item => platforms.push(item.codename));
        if (platforms.length) {
            value = `<div data-platform-chunk="${platforms.join('|')}"${getSmartLinkAttr(config, item.system.id, 'item')}${getSmartLinkAttr(config, 'content', 'element')}${getSmartLinkAttrInner(value, config)}>${value}</div>`;
        }
        return `<div${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}${getSmartLinkAttr(config, 'content', 'element')}${getSmartLinkAttrInner(value, config)}>${value}</div>`;
    },
    homeLinkToExternalUrl: (item, config) => {
        return `
            <li class="selection__item"${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}>
                <a class="selection__link" href="${item.url.value}">
                    <div class="selection__img-sizer">
                        <img class="selection__img" src="${item.image.value[0] ? `${item.image.value[0].url}?w=290&fm=pjpg&auto=format` : 'https://plchldr.co/i/290x168?&amp;bg=ededed&amp;text=Image'}"${getSmartLinkAttr(config, 'image', 'element')}>
                    </div>
                    <div class="selection__title"${getSmartLinkAttr(config, 'title', 'element')}>${item.title.value}</div>
                </a>
            </li>
        `;
    },
    codeSample: (item, config, type) => {
        const lang = helper.getPrismClassName(item.programming_language.value.length ? item.programming_language.value[0] : '');
        let infoBar = '<div class="infobar"><ul class="infobar__languages">';
        item.programming_language.value.forEach(item => {
            infoBar += `<li class="infobar__lang">${item.name}</li>`;
        });
        infoBar += '</ul><div class="infobar__copy"><div class="infobar__tooltip"></div></div></div>';

        return `<pre class="line-numbers" data-platform-code="${item.platform.value.length ? item.platform.value[0].codename : ''}"${getSmartLinkAttr(config, item.system.id, type || 'undecided', item.system.codename)}${getSmartLinkAttr(config, 'code', 'element')}>${infoBar}<div class="clean-code">${helper.escapeHtml(item.code.value)}</div><code class="${lang}">${helper.escapeHtml(item.code.value)}</code></pre>`;
    },
    contentSwitcher: (item, config) => {
        let switcher = `<div class="language-selector"${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}><ul class="language-selector__list">`;

        item.children.forEach(item => {
            switcher += `<li class="language-selector__item"><a class="language-selector__link" href="" data-platform="${item.platform.value.length ? item.platform.value[0].codename : ''}">${item.platform.value.length ? item.platform.value[0].name : ''}</a></li>`
        })
        switcher += '</ul></div>';

        return switcher;
    },
    codeSamples: (item, config) => {
        let codeExamples = `<div class="code-samples"${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}>`;
        item.code_samples.value.forEach(item => {
            codeExamples += richTextResolverTemplates.codeSample(item, config, 'item');
        });
        codeExamples += '</div>';

        return codeExamples;
    },
    releaseNote: (item, config) => {
        const isPlanned = (new Date(item.release_date.value)).getTime() > (new Date()).getTime();
        const severityCodename = item.severity.value.length ? item.severity.value[0].codename : '';
        const severityName = item.severity.value.length ? item.severity.value[0].name : '';
        const displaySeverity = severityCodename === 'breaking_change';
        const id = `a-${helper.generateAnchor(item.title.value)}`;

        let services = '';
        const servicesCodenames = [];
        item.affected_services.value.forEach((service) => {
            servicesCodenames.push(service.codename);
            services += `<li class="article__tags-item article__tags-item--green"${getSmartLinkAttr(config, 'affected_services', 'element')}>${service.name}</li>`;
        });

        return `
            <div class="mix ${servicesCodenames.join(' ')} ${severityCodename} all_changes"${getSmartLinkAttr(config, item.system.id, 'item')}>
                <h2 id="${id}"${getSmartLinkAttr(config, 'title', 'element')}>
                    <a href="#${id}" class="anchor-copy" aria-hidden="true"></a>
                    ${item.title.value}
                </h2>
                ${config.isPreview ? `<a href="${`https://app.kontent.ai/goto/edit-item/project/${config.projectid}/variant-codename/${config.language}/item/${item.system.id}`}" target="_blank" rel="noopener" class="edit-link edit-link--move-up">Edit</a>` : ''}
                <div class="article__info-bar">
                    <time class="article__date article__date--body" datetime="${moment(item.release_date.value).format('YYYY-MM-DD')}"${getSmartLinkAttr(config, 'release_date', 'element')}>${isPlanned ? 'Planned for ' : ''}${moment(item.release_date.value).format('MMMM D, YYYY')}</time>
                    ${displaySeverity || services
? `
                        <ul class="article__tags">
                            ${displaySeverity ? `<li class="article__tags-item article__tags-item--red"${getSmartLinkAttr(config, 'severity', 'element')}>${severityName}</li>` : ''}
                            ${services}
                        </ul>`
: ''}
                </div>
                <div${getSmartLinkAttr(config, 'content', 'element')}${getSmartLinkAttrInner(item.content.value, config)}>
                    ${item.content.value}
                </div>
            </div>
        `;
    },
    termDefinition: (item, config) => {
        const id = `a-${helper.generateAnchor(item.term.value)}`;
        return `
            <div${getSmartLinkAttr(config, item.system.id, 'item')}>
                <h2 id="${id}"${getSmartLinkAttr(config, 'term', 'element')}>
                    <a href="#${id}" class="anchor-copy" aria-hidden="true"></a>
                    ${item.term.value}
                </h2>
                ${config.isPreview ? `<a href="${`https://app.kontent.ai/goto/edit-item/project/${config.projectid}/variant-codename/${config.language}/item/${item.system.id}`}" target="_blank" rel="noopener" class="edit-link edit-link--move-up">Edit</a>` : ''}
                <div${getSmartLinkAttr(config, 'definition', 'element')}${getSmartLinkAttrInner(item.definition.value, config)}>
                    ${item.definition.value}
                </div>
            </div>
        `
    },
    changelog: (item, config) => {
        return `<div id="changelog-resolve"${getSmartLinkAttr(config, item.system.id, 'component')}></div>`;
    },
    terminology: (item, config) => {
        return `<div id="terminology-resolve"${getSmartLinkAttr(config, item.system.id, 'component')}></div>`;
    },
    certificationTest: (item, config) => {
        const urlMapItem = config.urlMap.filter(itemUrlMap => itemUrlMap.codename === item.system.codename);
        const url = urlMapItem.length ? urlMapItem[0].url : null;

        return `
            <div class="article__teaser"${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}>
                <h3${getSmartLinkAttr(config, 'title', 'element')}>${url ? `<a href="${url}">${item.title.value}</a>` : `${item.title.value}`}</h3>
                ${config.isPreview ? `<a href="${`https://app.kontent.ai/goto/edit-item/project/${config.projectid}/variant-codename/${config.language}/item/${item.system.id}`}" target="_blank" rel="noopener" class="edit-link edit-link--move-up">Edit</a>` : ''}
                <div class="article__introduction">
                    <div class="article__introduction-content">
                        <div${getSmartLinkAttr(config, 'description', 'element')}${getSmartLinkAttrInner(item.description.value, config)}>
                            ${item.description.value}
                        </div>
                        ${url && config.UIMessages && config.UIMessages.training___view_details
                            ? `  
                            <a href="${url}" class="call-to-action call-to-action--small"${getSmartLinkAttr(config, config.UIMessages.system.id, 'item')}${getSmartLinkAttr(config, 'training___view_details', 'element')}>
                                <span>${config.UIMessages.training___view_details.value}</span>
                                <span></span>
                            </a>
                        `
                        : ''}              
                    </div>
                </div>
            </div>`;
    },
    trainingCourse: (item, config) => {
        const personas = item.personas___topics__training_persona.value;
        const urlMapItem = config.urlMap.filter(itemUrlMap => itemUrlMap.codename === item.system.codename);
        const url = urlMapItem.length ? urlMapItem[0].url : null;
        const isFree = item.is_free ? helper.isCodenameInMultipleChoice(item.is_free.value, 'yes') : false;
        const imageWidth = item.thumbnail.value[0] ? item.thumbnail.value[0].width || 0 : 0;
        const imageHeight = item.thumbnail.value[0] ? item.thumbnail.value[0].height || 0 : 0;
        const placeholderSrc = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="${imageWidth}" height="${imageHeight}"></svg>`;
        const image = item.thumbnail.value.length ? `${item.thumbnail.value[0].url}?auto=format&w=116&fm=pjpg` : null;
        const imageMarkup = image
? `
            <img class="lazy lazy--exclude-dnt" src='${placeholderSrc}' data-src="${image}" alt="" data-dpr data-lazy-onload loading="lazy" ${imageWidth && imageHeight ? ` width="${imageWidth}" height="${imageHeight}"` : ''}${getSmartLinkAttr(config, 'thumbnail', 'element')}>
            <noscript>
                <img src="${image}" ${imageWidth && imageHeight ? ` width="${imageWidth}" height="${imageHeight}"` : ''}${getSmartLinkAttr(config, 'thumbnail', 'element')}>
            </noscript>
        `
: '';

        return `
            <div class="article__teaser mix ${personas.map(item => `${item.codename}`).join(' ')}"${getSmartLinkAttr(config, item.system.id, 'undecided', item.system.codename)}>
                <h3${getSmartLinkAttr(config, 'title', 'element')}>${url ? `<a href="${url}">${item.title.value}</a>` : `${item.title.value}`}${isFree ? `<span class="article__tag article__tag--blue">${config.UIMessages.training___free_course_label.value}</span>` : ''}</h3>
                ${config.isPreview ? `<a href="${`https://app.kontent.ai/goto/edit-item/project/${config.projectid}/variant-codename/${config.language}/item/${item.system.id}`}" target="_blank" rel="noopener" class="edit-link edit-link--move-up">Edit</a>` : ''}
                <div class="article__introduction">
                    ${image
? `
                        ${url ? `<a href="${url}" class="article__introduction-image">${imageMarkup}</a>` : `<div class="article__introduction-image">${imageMarkup}</div>`}
                    `
: ''}
                    <div class="article__introduction-content">
                        <div class="article__info-bar">
                            ${personas.length ? `<ul class="article__tags"${getSmartLinkAttr(config, 'persona', 'element')}>` : ''}
                            ${personas.map(item => `<li class="article__tags-item article__tags-item--green">${item.name}</li>`).join('')}
                            ${personas.length ? '</ul>' : ''}
                        </div>
                        <div${getSmartLinkAttr(config, 'description', 'element')}${getSmartLinkAttrInner(item.description.value, config)}>
                            ${item.description.value}
                        </div>
                        ${url && config.UIMessages && config.UIMessages.training___view_details
? `  
                            <a href="${url}" class="call-to-action call-to-action--small"${getSmartLinkAttr(config, config.UIMessages.system.id, 'item')}${getSmartLinkAttr(config, 'training___view_details', 'element')}>
                                <span>${config.UIMessages.training___view_details.value}</span>
                                <span></span>
                            </a>
                        `
: ''}
                    </div>
                </div>
            </div>
        `;
    },
    quote: (item, config) => {
        return `<div class="quote"${getSmartLinkAttr(config, item.system.id, 'item')}>
                    <div class="quote__text"${getSmartLinkAttr(config, 'quote', 'element')}>
                        ${item.quote.value}
                    </div>
                    <div class="quote__author"${getSmartLinkAttr(config, 'author', 'element')}>
                        &mdash; ${item.author.value}
                    </div>
                </div>`;
    },
    carousel: (item) => {
        const markupBefore = '<div class="carousel splide"><div class="splide__track"><ul class="splide__list">';
        const markupAfter = '</ul></div></div>';
        const carouselItems = helper.splitCarouselItems(item.content.value);

        if (carouselItems.count > 1) {
            return `${markupBefore}${carouselItems.markup}${markupAfter}`;
        }
        return carouselItems.markup;
    },
    runInPostmanButton: (item) => {
        return `<div class="postman-run-button"
                    data-postman-action="collection/fork"
                    data-postman-var-1="${item.collection_id.value}"
                    data-postman-collection-url="${item.collection_url.value}"${item.environment_id.value ? ` data-postman-param="${item.environment_id.value}"`: ''}>
                </div>
                <script type="text/javascript">
                    (function (p,o,s,t,m,a,n) {
                        !p[s] && (p[s] = function () { (p[t] || (p[t] = [])).push(arguments); });
                        !o.getElementById(s+t) && o.getElementsByTagName("head")[0].appendChild((
                        (n = o.createElement("script")),
                        (n.id = s+t), (n.async = 1), (n.src = m), n
                        ));
                    }(window, document, "_pm", "PostmanRunObject", "https://run.pstmn.io/button.js"));
                </script>`;
    },
    question: (item) => {
        const name = helper.removeUnnecessaryWhitespace(helper.removeNewLines(helper.removeQuotes(helper.stripTags(item.question.value)))).trim();
        return `<fieldset class="question">
                    <legend class="question__legend">${item.question.value}</legend>
                    <div class="question__answers">
                        ${helper.injectHTMLAttr({
                            markup: item.answers.resolveHtml(),
                            selector: '.answer__radio',
                            attr: 'name',
                            attrValue: `${name}|${item.system.id}|radio`
                        })}
                    </div>
                </fieldset>`;
    },
    questionFreeText: (item) => {
        const name = helper.removeUnnecessaryWhitespace(helper.removeNewLines(helper.removeQuotes(helper.stripTags(item.question.value)))).trim();
        return `<fieldset class="question">
                    <label class="question__legend" for="${item.system.codename}">${item.question.value}</label>
                    <textarea class="question__textarea" name="${name}|${item.system.id}|textarea" for="${item.system.codename}"></textarea>
                </fieldset>`;
    },
    answer: (item) => {
        const content = item.answer.resolveHtml();
        const value = helper.removeUnnecessaryWhitespace(helper.removeNewLines(helper.removeQuotes(helper.stripTags(content)))).trim();
        return `<div class="answer">
                    <div class="answer__wrapper">
                        <div class="answer__form-elements">
                            <input class="answer__radio" type="radio" tabIndex="-1" value="${value}|${item.system.id}" id="${item.system.codename}" />
                            <label class="answer__radio-label" for="${item.system.codename}">${value}</label>
                        </div>
                        <div class="answer__visual-elements">
                            <div class="answer__content">
                                ${content}
                            </div>
                            <a data-form-answer href="#${item.system.codename}" class="answer__link"></a>
                        </div>
                    </div>
                </div>`;
    }
};

module.exports = richTextResolverTemplates;
