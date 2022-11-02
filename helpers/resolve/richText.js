const { createRichTextHtmlResolver, linkedItemsHelper } = require('@kontent-ai/delivery-sdk');
const { nodeParser } = require('@kontent-ai/delivery-node-parser');
const cheerio = require('cheerio');
const {
    escapeHtml,
    escapeQuotesHtml,
    generateAnchor,
    getPrismClassName,
    injectHTMLAttr,
    isCodenameInMultipleChoice,
    isNotEmptyRichText,
    removeNewLines,
    removeQuotes,
    removeUnnecessaryWhitespace,
    splitCarouselItems,
    stripTags
} = require('../general/helper');
const smartLink = require('../kontent/smartLink');
const { resolveLink } = require('./links');
const enhanceMarkup = require('./enhanceMarkup');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Europe/Prague');

const getSmartLinkAttr = (config, id, type) => {
    if (!config.isPreview) return '';

    let smartLinkObj = null;
    if (type === 'element') {
        smartLinkObj = config.isPreview ? smartLink.elementCodename(id) : null;
    } else if (type === 'component') {
        smartLinkObj = config.isPreview ? smartLink.componentId(id) : null;
    } else if (type === 'item') {
        smartLinkObj = config.isPreview ? smartLink.itemId(id) : null;
    } else if (type === 'undecided') {
        smartLinkObj = config.isPreview ? smartLink.undecided(id) : null;
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

const getImageAttributes = (item, cssClass) => {
    let transformationQueryString = '?';

    if (item.elements.image.value.length && item.elements.image.value[0].url.endsWith('.gif')) {
        transformationQueryString += 'fm=mp4';
    } else {
        transformationQueryString += 'fm=pjpg&auto=format';
    }

    const renditionsQueryString = item.elements.image.value[0]?.contract?.renditions?.default?.query;
    if (renditionsQueryString) transformationQueryString += `&${renditionsQueryString}`;

    if (item.elements.image_width.value.length) {
        switch (item.elements.image_width.value[0].codename) {
            case 'n25_':
                cssClass += ' article__image--25';
                if (!renditionsQueryString) transformationQueryString += '&w=168';
                break;
            case 'n50_':
                cssClass += ' article__image--50';
                if (!renditionsQueryString) transformationQueryString += '&w=336';
                break;
            case 'n75_':
                cssClass += ' article__image--75';
                if (!renditionsQueryString) transformationQueryString += '&w=504';
                break;
            case 'n100_':
                cssClass += ' article__image--100';
                if (!renditionsQueryString) transformationQueryString += '&w=672';
                break;
            default:
                if (!renditionsQueryString) transformationQueryString += '&w=896';
        }
    }

    return {
        cssClass: cssClass,
        transformationQueryString: transformationQueryString
    }
};

const getCalendarClassNames = (releaseDate) => {
    const date = dayjs.tz(releaseDate);
    if (date.isAfter()) return 'future';
    return `date-${date.format('M-YYYY')}`;
};

const getYoutubeTemplate = (cssClass, item, config) => {
    return `
        ${config.isPreview ? `<div$${getSmartLinkAttr(config, item.system.id, 'undecided')}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed${cssClass}">
            <iframe class="lazy" width="560" height="315" data-src="https://www.youtube-nocookie.com/embed/${item.elements.id.value}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>
            <noscript>
                <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/${item.elements.id.value}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>
            </noscript>
        </div>
        ${isNotEmptyRichText(item.elements.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.elements.caption.value, config)}>${item.elements.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>Play video on <a href="https://www.youtube.com/watch?v=${item.elements.id.value}"> https://www.youtube.com/watch?v=${item.elements.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getCodepenTemplate = (cssClass, item, config) => {
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided')}>` : ''}
        <div class="embed${cssClass}">
            <iframe class="lazy" height="265" scrolling="no" data-src="https://codepen.io/${item.elements.id.value.replace('/pen/', '/embed/')}/?height=265&amp;theme-id=0" frameborder="no" allowtransparency="true" allowfullscreen="true"${getSmartLinkAttr(config, 'id', 'element')}></iframe>
            <noscript>
                <iframe height="265" scrolling="no" src="https://codepen.io/${item.elements.id.value}/?height=265&amp;theme-id=0" frameborder="no" allowtransparency="true" allowfullscreen="true"${getSmartLinkAttr(config, 'id', 'element')}></iframe>
            </noscript>
        </div>
        ${isNotEmptyRichText(item.elements.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.elements.caption.value, config)}>${item.elements.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the code example on <a href="https://codepen.io/${item.elements.id.value}">https://codepen.io/${item.elements.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getStackblitzTemplate = (cssClass, item, config) => {
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided')}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed${cssClass}">
            <iframe class="lazy" data-src="https://stackblitz.com/edit/${item.elements.id.value}?embed=1"></iframe>
            <noscript>
                <iframe src="https://stackblitz.com/edit/${item.elements.id.value}?embed=1"></iframe>
            </noscript>
        </div>
        ${isNotEmptyRichText(item.elements.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.elements.caption.value, config)}>${item.elements.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the code example on <a href="https://stackblitz.com/edit/${item.elements.id.value}">https://stackblitz.com/edit/${item.elements.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getCodesandboxTemplate = (cssClass, item, config) => {
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided')}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed${cssClass}">
            <iframe class="lazy" data-src="https://codesandbox.io/embed/${item.elements.id.value}"></iframe>
            <noscript>
                <iframe src="https://codesandbox.io/embed/${item.elements.id.value}"></iframe>
            </noscript>
        </div>
        ${isNotEmptyRichText(item.elements.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.elements.caption.value, config)}>${item.elements.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the code example on <a href="https://codesandbox.io/s/${item.elements.id.value}">https://codesandbox.io/s/${item.elements.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getNetlifyTemplate = (cssClass, item, config, netlifyId) => {
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided')}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed${cssClass}">
            <iframe class="lazy lazy--exclude-dnt" data-src="https://${netlifyId[0]}.netlify.com/${netlifyId[1]}"></iframe>
            <noscript>
                <iframe src="https://${netlifyId[0]}.netlify.com${netlifyId[1]}"></iframe>
            </noscript>
        </div>
        ${isNotEmptyRichText(item.elements.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.elements.caption.value, config)}>${item.elements.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the example on <a href="https://${netlifyId[0]}.netlify.com${netlifyId[1]}">https://${netlifyId[0]}.netlify.com${netlifyId[1]}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getGiphyTemplate = (cssClass, item, config) => {
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided')}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed embed--giphy${cssClass}">
            <iframe class="lazy" data-src="https://giphy.com/embed/${item.elements.id.value}"></iframe>
            <div class="embed__overlay" aria-hidden="true"></div>
            <noscript>
                <iframe src="https://giphy.com/embed/${item.elements.id.value}"></iframe>
            </noscript>
            <a class="embed__link" href="https://giphy.com/gifs/${item.elements.id.value}" target="_blank">via GIPHY</a>
        </div>
        ${isNotEmptyRichText(item.elements.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.elements.caption.value, config)}>${item.elements.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the image on <a href="https://giphy.com/embed/${item.elements.id.value}">https://giphy.com/embed/${item.elements.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getDiagramsnetTemplate = (cssClass, item, config, elemId) => {
    const zoomable = item.elements.zoomable.value.length && item.elements.zoomable.value[0].codename === 'true';
    return `
        ${config.isPreview ? `<div${getSmartLinkAttr(config, item.system.id, 'undecided')}${getSmartLinkAttr(config, 'id', 'element')}>` : ''}
        <div class="embed embed--diagrams-net${cssClass}" id="embed-${elemId}">
            <iframe width="2000" height="1125" class="lazy" frameborder="0" data-src="https://viewer.diagrams.net?lightbox=1&nav=1#${item.elements.id.value}"></iframe>
            ${zoomable ? `<a data-lightbox-embed="embed-${elemId}" target="_blank" href="https://viewer.diagrams.net?lightbox=1&nav=1#${item.elements.id.value}" class="embed__overlay" aria-hidden="true" data-overlay-text="Zoom diagram"></a>` : '<div class="embed__overlay" aria-hidden="true"></div>'}     
            <noscript>
                <iframe frameborder="0" src="https://viewer.diagrams.net?lightbox=1&nav=1#${item.elements.id.value}"></iframe>
            </noscript>
        </div>
        ${isNotEmptyRichText(item.elements.caption.value) ? `<div class="figcaption"${getSmartLinkAttr(config, 'caption', 'element')}${getSmartLinkAttrInner(item.elements.caption.value, config)}>${item.elements.caption.value}</div>` : ''}
        <p class="print-only"> 
            <i>See the diagram on <a href="https://viewer.diagrams.net?lightbox=1&nav=1#${item.elements.id.value}">https://viewer.diagrams.net?lightbox=1&nav=1#${item.elements.id.value}</a></i>
        </p>
        ${config.isPreview ? '</div>' : ''}
    `;
};

const getEmbeddedTemplate = (cssClass, item, config, netlifyId) => {
    const elemId = `${item.elements.provider.value[0].codename}-${Math.floor(Math.random() * 9999999) + 1}`;
    return {
        youtube: getYoutubeTemplate(cssClass, item, config).trim(),
        codepen: getCodepenTemplate(cssClass, item, config).trim(),
        stackblitz: getStackblitzTemplate(cssClass, item, config).trim(),
        codesandbox: getCodesandboxTemplate(cssClass, item, config).trim(),
        netlify: getNetlifyTemplate(cssClass, item, config, netlifyId).trim(),
        giphy: getGiphyTemplate(cssClass, item, config).trim(),
        diagrams_net: getDiagramsnetTemplate(cssClass, item, config, elemId).trim()
    }
};

const templates = {
    embeddedContent: (item, config) => {
        let cssClass = '';
        let netlifyId = '';

        if (item.elements.width.value.length) {
            switch (item.elements.width.value[0].codename) {
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

        if (item.elements.provider.value.length && item.elements.provider.value[0].codename === 'netlify') {
            netlifyId = item.elements.id.value.trim().split(';');

            if (!netlifyId[1]) {
                netlifyId[1] = '';
            }
        }

        if (item.elements.provider.value.length) {
            const templates = getEmbeddedTemplate(cssClass, item, config, netlifyId);
            return `<div>${templates[item.elements.provider.value[0].codename] || ''}</div>`;
        }

        return '<div></div>';
    },
    signpost: (item, config) => {
        let type = '';
        let listClass = '';
        let itemsToShow = -1;
        const missingTitle = (item.elements.title.value === '' || item.elements.title.value === '<p><br></p>');
        const missingDescription = (item.elements.description.value === '' || item.elements.description.value === '<p><br></p>');

        if (item.elements.type.value.length) type = item.elements.type.value[0].codename;
        if (type === 'platform_selection') listClass = ' selection--platforms';
        if (item.elements.items_to_show.value) itemsToShow = parseInt(item.elements.items_to_show.value);

        return `
            <section class="presentation__section${missingTitle && missingDescription ? ' presentation__section--list-only' : ''}"${getSmartLinkAttr(config, item.system.id, 'undecided')}>
                ${!missingTitle ? `<h2 class="presentation__heading"${getSmartLinkAttr(config, 'title', 'element')}>${item.elements.title.value}</h2>` : ''}
                ${!missingDescription ? `<span class="presentation__sub-heading"${getSmartLinkAttr(config, 'description', 'element')}>${item.elements.description.value}</span>` : ''}
                <ul class="selection${listClass}" data-items-to-show="${!isNaN(itemsToShow) && itemsToShow > -1 ? itemsToShow : -1}"${getSmartLinkAttr(config, 'content', 'element')}${getSmartLinkAttrInner(item.elements.content.value, config)}>
                    ${item.elements.content.value}
                </ul>
            </section>
        `;
    },
    signpostItem: (item, config) => {
        const urlMap = config.urlMap;
        let resolvedUrl = '/learn/page-not-found';
        const imageWidth = item.elements.image.value[0] ? item.elements.image.value[0].width || 0 : 0;
        const imageHeight = item.elements.image.value[0] ? item.elements.image.value[0].height || 0 : 0;
        const placeholderSrc = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="${imageWidth}" height="${imageHeight}"></svg>`;
        const imageSrc = item.elements.image.value[0] ? `${item.elements.image.value[0].url}?w=290&fm=pjpg&auto=format` : '';
        let target = 'self';
        if (item.elements.link__link_to_content_item.linkedItems[0] && urlMap) {
            const matchUrlMapItem = urlMap.filter(elem => elem.codename === item.elements.link__link_to_content_item.linkedItems[0].system.codename);

            if (matchUrlMapItem.length) {
                resolvedUrl = matchUrlMapItem[0].url;

                if (matchUrlMapItem[0].type === 'multiplatform_article') {
                    resolvedUrl += '?tech={tech}';
                }
            }
        }

        if (item.elements.link__link_to_web_url.value) {
            target = 'blank';
            resolvedUrl = item.elements.link__link_to_web_url.value;
        }

        return `
            <li class="selection__item"${getSmartLinkAttr(config, item.system.id, 'undecided')}>
                <div class="selection__link">
                    <a target="_${target}" class="selection__a" href="${resolvedUrl}"${resolvedUrl.indexOf('tech={tech}') > -1 ? ' rel="nofollow"' : ''}>
                        ${item.elements.title.value ? `<div class="sr-only">${item.elements.title.value}</div>` : ''}
                    </a>
                    ${item.elements.image.value[0]
? `
                        <div class="selection__img-sizer"${getSmartLinkAttr(config, 'image', 'element')}>
                            <img class="selection__img lazy lazy--exclude-dnt" data-dpr data-lazy-onload src='${placeholderSrc}' data-src="${imageSrc}"${imageWidth && imageHeight ? `width="${imageWidth}" height="${imageHeight}"` : ''}>
                            <noscript>
                                <img class="selection__img" src="${imageSrc}">
                            </noscript>
                        </div> 
                    `
: ''}
                    ${item.elements.title.value ? `<div class="selection__title"${getSmartLinkAttr(config, 'title', 'element')}>${item.elements.title.value}</div>` : ''}
                    ${isNotEmptyRichText(item.elements.description.value) ? `<div class="selection__description"${getSmartLinkAttr(config, 'description', 'element')}${getSmartLinkAttrInner(item.elements.description.value, config)}>${item.elements.description.value}</div>` : ''}
                </div>
            </li>
        `;
    },
    homeLinkToContentItem: (item, config) => {
        const urlMap = config.urlMap;
        let resolvedUrl = '';
        const imageWidth = item.elements.image.value[0] ? item.elements.image.value[0].width || 0 : 0;
        const imageHeight = item.elements.image.value[0] ? item.elements.image.value[0].height || 0 : 0;
        const placeholderSrc = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="${imageWidth}" height="${imageHeight}"></svg>`;
        const imageSrc = item.elements.image.value[0] ? `${item.elements.image.value[0].url}?w=290&fm=pjpg&auto=format` : 'https://plchldr.co/i/290x168?&amp;bg=ededed&amp;text=Image';

        if (item.elements.linked_item.value[0] && urlMap) {
            const matchUrlMapItem = urlMap.filter(elem => elem.codename === item.elements.link__link_to_content_item.value[0].system.codename);
            if (matchUrlMapItem.length) {
                resolvedUrl = matchUrlMapItem[0].url;

                if (matchUrlMapItem[0].type === 'multiplatform_article') {
                    resolvedUrl += '?tech={tech}';
                }
            }
        }

        return `
            <li class="selection__item"${getSmartLinkAttr(config, item.system.id, 'undecided')}>
                ${resolvedUrl ? `<a class="selection__link" href="${resolvedUrl}"${resolvedUrl.indexOf('tech={tech}') > -1 ? ' rel="nofollow"' : ''}>` : '<div class="selection__link">'}
                    <div class="selection__img-sizer">
                        <img class="selection__img lazy lazy--exclude-dnt" data-dpr data-lazy-onload loading="lazy" src='${placeholderSrc}' data-src="${imageSrc}"${imageWidth && imageHeight ? ` width="${imageWidth}" height="${imageHeight}"` : ''}${getSmartLinkAttr(config, 'image', 'element')}>
                        <noscript>
                            <img class="selection__img" src="${imageSrc}"${getSmartLinkAttr(config, 'image', 'element')}>
                        </noscript>
                    </div>
                    <div class="selection__title"${getSmartLinkAttr(config, 'title', 'element')}>${item.elements.title.value}</div>
                ${resolvedUrl ? '</a>' : '</div>'}
            </li>
        `;
    },
    callout: (item, config) => {
        return `
            <div class="callout callout--${item.elements.type.value.length ? item.elements.type.value[0].codename : ''}"${getSmartLinkAttr(config, item.system.id, 'undecided')}>
                <div${getSmartLinkAttr(config, 'content', 'element')}${getSmartLinkAttrInner(item.elements.content.value, config)}>${item.elements.content.value}</div>
            </div>`;
    },
    image: (item, config) => {
        if (item.elements.image.value.length) {
            const alt = item.elements.image.value[0].description ? escapeQuotesHtml(item.elements.image.value[0].description) : '';
            const url = item.elements.url.value.trim();
            const zoomable = item.elements.zoomable.value.length && item.elements.zoomable.value[0].codename === 'true';
            let cssClass = ' article__image-border'; // Always show border
            cssClass += zoomable && !url ? ' article__add-lightbox' : '';
            const imageWidth = item.elements.image.value[0] ? item.elements.image.value[0]?.contract?.renditions?.default?.width || item.elements.image.value[0].width || 0 : 0;
            const imageHeight = item.elements.image.value[0] ? item.elements.image.value[0]?.contract?.renditions?.default?.height || item.elements.image.value[0].height || 0 : 0;
            const openLinkTag = url ? `<a href="${url}" target="_blank" class="no-icon"${getSmartLinkAttr(config, 'url', 'element')}>` : '';
            const closeLinkTag = url ? '</a>' : '';
            const attributes = getImageAttributes(item, cssClass);

            if (item.elements.image.value[0].url.endsWith('.gif')) {
                return `
                    <figure${getSmartLinkAttr(config, item.system.id, 'undecided')}>
                        <div class="video-controls"${zoomable && !url ? ' data-lightbox-video' : ''}${url ? ` data-video-url="${url}"` : ''}>
                            <video class="article__image article__image--video lazy lazy--exclude-dnt ${attributes.cssClass}" preload="none" muted playsinline${imageWidth && imageHeight ? ` width="${imageWidth}" height="${imageHeight}"` : ''}${getSmartLinkAttr(config, 'image', 'element')}>
                                <source src="${item.elements.image.value[0].url}${attributes.transformationQueryString}" type="video/mp4">
                            </video>
                        </div>
                        <div class="print-only"> 
                            <img class="article__image ${attributes.cssClass}"${imageWidth && imageHeight ? ` width="${imageWidth}" height="${imageHeight}"` : ''} alt="${alt}" data-src="${item.elements.image.value[0].url}">
                        </div>
                        ${isNotEmptyRichText(item.elements.description.value) ? `<figcaption${getSmartLinkAttr(config, 'description', 'element')}${getSmartLinkAttrInner(item.elements.description.value, config)}>${item.elements.description.value}</figcaption>` : ''}
                    </figure>`;
            }

            return `
                <figure${getSmartLinkAttr(config, item.system.id, 'undecided')}>
                    ${openLinkTag}
                    <img class="article__image lazy lazy--exclude-dnt ${attributes.cssClass}" alt="${alt}" data-dpr data-lazy-onload loading="lazy" src="${item.elements.image.value[0].url}${attributes.transformationQueryString}"${imageWidth && imageHeight ? ` width="${imageWidth}" height="${imageHeight}"` : ''}${getSmartLinkAttr(config, 'image', 'element')}${zoomable && !url ? ' data-lightbox-image' : ''}>
                    ${closeLinkTag}
                    <noscript>
                        ${openLinkTag}
                            <img class="article__image ${attributes.cssClass}" alt="${alt}" src="${item.elements.image.value[0].url}${attributes.transformationQueryString}"${getSmartLinkAttr(config, 'image', 'element')}>
                        ${closeLinkTag}
                    </noscript>
                    ${isNotEmptyRichText(item.elements.description.value) ? `<figcaption${getSmartLinkAttr(config, 'description', 'element')}${getSmartLinkAttrInner(item.elements.description.value, config)}>${item.elements.description.value}</figcaption>` : ''}
                </figure>`;
        }

        return '<div></div>';
    },
    callToAction: (item, config) => {
        const action = item.elements.action.value.length ? item.elements.action.value[0].codename : null;
        const smartLinkComponentAttr = getSmartLinkAttr(config, item.system.id, 'undecided');
        const smartLinkAttr = getSmartLinkAttr(config, 'text', 'element');

        if (action === 'show_intercom') {
            return `<div class="call-to-action" data-click="support"${smartLinkComponentAttr}${smartLinkAttr}><span>${item.elements.text.value}</span><span></span></div>`;
        }

        if (action === 'enable_embed') {
            return `<div class="call-to-action"${smartLinkComponentAttr}${smartLinkAttr}><span>${item.elements.text.value}</span><span></span></div>`;
        }

        const urlMap = config.urlMap;
        let resolvedUrl = '';

        if (item.elements.link__link_to_content_item.value[0] && urlMap) {
            const matchUrlMapItem = urlMap.filter(elem => elem.codename === item.elements.link__link_to_content_item.linkedItems[0].system.codename);
            if (matchUrlMapItem.length) {
                resolvedUrl = matchUrlMapItem[0].url;

                if (matchUrlMapItem[0].type === 'multiplatform_article') {
                    resolvedUrl += '?tech={tech}';
                }
            }
        }

        if (item.elements.link__link_to_web_url.value) {
            resolvedUrl = item.elements.link__link_to_web_url.value;
        }

        if (!resolvedUrl) {
            resolvedUrl = '/learn/page-not-found';
        }

        return `<a href="${resolvedUrl}" class="call-to-action"${resolvedUrl.indexOf('tech={tech}') > -1 ? ' rel="nofollow"' : ''}${smartLinkComponentAttr}${smartLinkAttr}><span>${item.elements.text.value}</span><span></span></a>`;
    },
    contentChunk: (item, config) => {
        const platforms = [];
        let value = item.elements.content.value;
        item.elements.platform.value.forEach(item => platforms.push(item.codename));
        if (platforms.length) {
            value = `<div data-platform-chunk="${platforms.join('|')}"${getSmartLinkAttr(config, item.system.id, 'item')}${getSmartLinkAttr(config, 'content', 'element')}${getSmartLinkAttrInner(value, config)}>${value}</div>`;
        }
        return `<div${getSmartLinkAttr(config, item.system.id, 'undecided')}${getSmartLinkAttr(config, 'content', 'element')}${getSmartLinkAttrInner(value, config)}>${value}</div>`;
    },
    homeLinkToExternalUrl: (item, config) => {
        return `
            <li class="selection__item"${getSmartLinkAttr(config, item.system.id, 'undecided')}>
                <a class="selection__link" href="${item.elements.url.value}">
                    <div class="selection__img-sizer">
                        <img class="selection__img" src="${item.elements.image.value[0] ? `${item.elements.image.value[0].url}?w=290&fm=pjpg&auto=format` : 'https://plchldr.co/i/290x168?&amp;bg=ededed&amp;text=Image'}"${getSmartLinkAttr(config, 'image', 'element')}>
                    </div>
                    <div class="selection__title"${getSmartLinkAttr(config, 'title', 'element')}>${item.elements.title.value}</div>
                </a>
            </li>
        `;
    },
    codeSample: (item, config, type) => {
        const lang = getPrismClassName(item.elements.programming_language.value.length ? item.elements.programming_language.value[0] : '');
        let infoBar = '<div class="infobar"><ul class="infobar__languages">';
        item.elements.programming_language.value.forEach(item => {
            infoBar += `<li class="infobar__lang">${item.name}</li>`;
        });
        infoBar += '</ul><div class="infobar__copy"><div class="infobar__tooltip"></div></div></div>';

        return `<pre class="line-numbers" data-platform-code="${item.elements.platform.value.length ? item.elements.platform.value[0].codename : ''}"${getSmartLinkAttr(config, item.system.id, type || 'undecided')}${getSmartLinkAttr(config, 'code', 'element')}>${infoBar}<div class="clean-code">${escapeHtml(item.elements.code.value)}</div><code class="${lang}">${escapeHtml(item.elements.code.value)}</code></pre>`;
    },
    contentSwitcher: (item, config) => {
        let switcher = `<div class="language-selector"${getSmartLinkAttr(config, item.system.id, 'undecided')}><ul class="language-selector__list">`;

        item.elements.children.forEach(item => {
            switcher += `<li class="language-selector__item"><a class="language-selector__link" href="" data-platform="${item.elements.platform.value.length ? item.elements.platform.value[0].codename : ''}">${item.elements.platform.value.length ? item.elements.platform.value[0].name : ''}</a></li>`
        })
        switcher += '</ul></div>';

        return switcher;
    },
    codeSamples: (item, config) => {
        let codeExamples = `<div class="code-samples"${getSmartLinkAttr(config, item.system.id, 'undecided')}>`;
        item.elements.code_samples.linkedItems.forEach(item => {
            codeExamples += templates.codeSample(item, config, 'item');
        });
        codeExamples += '</div>';

        return codeExamples;
    },
    releaseNote: (item, config) => {
        const isPlanned = (new Date(item.elements.release_date.value)).getTime() > (new Date()).getTime();
        const severityCodename = item.elements.severity.value.length ? item.elements.severity.value[0].codename : '';
        const severityName = item.elements.severity.value.length ? item.elements.severity.value[0].name : '';
        const released = dayjs.tz(item.elements.release_date.value).isBefore() ? 'released' : '';
        const displaySeverity = severityCodename === 'breaking_change';
        const id = `a-${generateAnchor(item.elements.title.value)}`;
        const calendar = getCalendarClassNames(item.elements.release_date.value);

        let services = '';
        const servicesCodenames = [];
        item.elements.affected_services.value.forEach((service) => {
            servicesCodenames.push(service.codename);
            services += `<li class="article__tags-item article__tags-item--green"${getSmartLinkAttr(config, 'affected_services', 'element')}>${service.name}</li>`;
        });

        return `
            <div class="mix ${servicesCodenames.join(' ')} ${severityCodename} ${released} ${calendar}"${getSmartLinkAttr(config, item.system.id, 'item')}>
                <div class="release-note"> 
                    <div class="release-note__info">   
                        <h2 id="${id}"${getSmartLinkAttr(config, 'title', 'element')}>
                            <a href="#${id}" class="anchor-copy" aria-hidden="true"></a>
                            ${item.elements.title.value}
                        </h2>
                        ${config.isPreview ? `<a href="${`https://app.kontent.ai/goto/edit-item/project/${config.projectid}/variant-codename/${config.language}/item/${item.system.id}`}" target="_blank" rel="noopener" class="edit-link edit-link--move-up">Edit</a>` : ''}
                        <div class="release-note__bar">
                            <time class="release-note__date" datetime="${dayjs.tz(item.elements.release_date.value).format('YYYY-MM-DD')}"${getSmartLinkAttr(config, 'release_date', 'element')}>${isPlanned ? 'Planned for ' : ''}${dayjs.tz(item.elements.release_date.value).format('MMMM D, YYYY')}</time>
                            ${displaySeverity || services
        ? `
                                <ul class="article__tags">
                                    ${displaySeverity ? `<li class="article__tags-item article__tags-item--red"${getSmartLinkAttr(config, 'severity', 'element')}>${severityName}</li>` : ''}
                                    ${services}
                                </ul>`
        : ''}
                        </div>
                    </div>
                    <div class="release-note__description" ${getSmartLinkAttr(config, 'content', 'element')}${getSmartLinkAttrInner(item.elements.content.value, config)}>
                        ${item.elements.content.value}
                    </div>
                </div>
            </div>
        `;
    },
    termDefinition: (item, config) => {
        const id = `a-${generateAnchor(item.elements.term.value)}`;
        return `
            <div${getSmartLinkAttr(config, item.system.id, 'item')}>
                <h2 id="${id}"${getSmartLinkAttr(config, 'term', 'element')}>
                    <a href="#${id}" class="anchor-copy" aria-hidden="true"></a>
                    ${item.elements.term.value}
                </h2>
                ${config.isPreview ? `<a href="${`https://app.kontent.ai/goto/edit-item/project/${config.projectid}/variant-codename/${config.language}/item/${item.system.id}`}" target="_blank" rel="noopener" class="edit-link edit-link--move-up">Edit</a>` : ''}
                <div${getSmartLinkAttr(config, 'definition', 'element')}${getSmartLinkAttrInner(item.elements.definition.value, config)}>
                    ${item.elements.definition.value}
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
    quote: (item, config) => {
        return `<div class="quote"${getSmartLinkAttr(config, item.system.id, 'item')}>
                    <div class="quote__text"${getSmartLinkAttr(config, 'quote', 'element')}>
                        ${item.elements.quote.value}
                    </div>
                    <div class="quote__author"${getSmartLinkAttr(config, 'author', 'element')}>
                        &mdash; ${item.elements.author.value}
                    </div>
                </div>`;
    },
    carousel: (item) => {
        const markupBefore = '<div class="carousel splide"><div class="splide__track"><ul class="splide__list">';
        const markupAfter = '</ul></div></div>';
        const carouselItems = splitCarouselItems(item.elements.content.value);

        if (carouselItems.count > 1) {
            return `${markupBefore}${carouselItems.markup}${markupAfter}`;
        }
        return carouselItems.markup;
    },
    runInPostmanButton: (item) => {
        return `<div><div class="postman-run-button"
                    data-postman-action="collection/fork"
                    data-postman-var-1="${item.elements.collection_id.value}"
                    data-postman-collection-url="${item.elements.collection_url.value}"${item.elements.environment_id.value ? ` data-postman-param="${item.elements.environment_id.value}"`: ''}>
                </div>
                <script type="text/javascript">
                    (function (p,o,s,t,m,a,n) {
                        !p[s] && (p[s] = function () { (p[t] || (p[t] = [])).push(arguments); });
                        !o.getElementById(s+t) && o.getElementsByTagName("head")[0].appendChild((
                        (n = o.createElement("script")),
                        (n.id = s+t), (n.async = 1), (n.src = m), n
                        ));
                    }(window, document, "_pm", "PostmanRunObject", "https://run.pstmn.io/button.js"));
                </script></div>`;
    },
    question: (item) => {
        const name = removeUnnecessaryWhitespace(removeNewLines(removeQuotes(stripTags(item.elements.question.value)))).trim();
        return `<fieldset class="question">
                    <legend class="question__legend">${item.elements.question.value}</legend>
                    <div class="question__answers">
                        ${injectHTMLAttr({
                            markup: item.elements.answers,
                            selector: '.answer__radio',
                            attr: 'name',
                            attrValue: `${name}|${item.system.id}|radio`
                        })}
                    </div>
                </fieldset>`;
    },
    questionFreeText: (item) => {
        const name = removeUnnecessaryWhitespace(removeNewLines(removeQuotes(stripTags(item.elements.question.value)))).trim();
        return `<fieldset class="question">
                    <label class="question__legend" for="${item.system.codename}">${item.elements.question.value}</label>
                    <textarea class="question__textarea" name="${name}|${item.system.id}|textarea" for="${item.system.codename}"></textarea>
                </fieldset>`;
    },
    answer: (item) => {
        const content = item.answer;
        const value = removeUnnecessaryWhitespace(removeNewLines(removeQuotes(stripTags(content)))).trim();
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
    },
    trainingCourse: (item, config) => {
        const urlMapItem = config.urlMap.find(elem => elem.codename === item.system.codename);
        let url = '#';
        if (urlMapItem) url = urlMapItem.url;
        const isFree = item.elements.is_free ? isCodenameInMultipleChoice(item.elements.is_free.value, 'yes') : false;
        return `<div class="tile tile--article"${getSmartLinkAttr(config, item.system.id, 'item')}>
                    ${item.elements.thumbnail && item.elements.thumbnail.value.length
                        ? `
                        <div class="tile__img"${getSmartLinkAttr(config, 'thumbnail', 'element')}>
                            <img src="${item.elements.thumbnail.value[0].url}">
                        </div>
                        `
                    : ''}
                    <div class="tile__content">
                        <span role="heading" class="tile__title"${getSmartLinkAttr(config, 'title', 'element')}>
                            ${item.elements.title.value}${isFree ? '<span class="tile__tag tile__tag--green">Free</span>' : ''}
                        </span>
                        <div class="tile__description"${getSmartLinkAttr(config, 'description', 'element')}>
                            ${isNotEmptyRichText(item.elements.description.value) ? item.elements.description.value : ''}
                        </div>
                        <a class="tile__cta" href="${url}"> 
                            <span>View details</span>
                            <span></span>
                        </a>
                    </div>
                </div>`;
    },
};

const componentsResolvers = [{
    type: 'embedded_content',
    template: templates.embeddedContent
}, {
    type: 'signpost',
    template: templates.signpost
}, {
    type: 'signpost_item',
    template: templates.signpostItem
}, {
    type: 'callout',
    template: templates.callout
}, {
    type: 'home__link_to_content_item',
    template: templates.homeLinkToContentItem
}, {
    type: 'image',
    template: templates.image
}, {
    type: 'call_to_action',
    template: templates.callToAction
}, {
    type: 'home__link_to_external_url',
    template: templates.homeLinkToExternalUrl
}, {
    type: 'code_sample',
    template: templates.codeSample
}, {
    type: 'code_samples',
    template: templates.codeSamples
}, {
    type: 'content_chunk',
    template: templates.contentChunk
}, {
    type: 'content_switcher',
    template: templates.contentSwitcher
}, {
    type: 'release_note',
    template: templates.releaseNote
}, {
    type: 'changelog',
    template: templates.changelog
}, {
    type: 'terminology',
    template: templates.terminology
}, {
    type: 'quote',
    template: templates.quote
}, {
    type: 'carousel',
    template: templates.carousel
}, {
    type: 'run_in_postman_button',
    template: templates.runInPostmanButton
}, {
    type: 'run_in_postman_button',
    template: templates.runInPostmanButton
}, {
    type: 'training_question_for_survey_and_test',
    template: templates.question
}, {
    type: 'training_question_free_text',
    template: templates.questionFreeText
}, {
    type: 'training_answer_for_survey_and_test',
    template: templates.answer
}, {
    type: 'training_course2',
    template: templates.trainingCourse
}];

const richTextResolver = (element, linkedItems, config) => {
    linkedItems = linkedItemsHelper.convertLinkedItemsToArray(linkedItems)
    const resolved = createRichTextHtmlResolver(nodeParser).resolveRichText({
        element: element,
        linkedItems: linkedItems,
        urlResolver: (linkId, linkText, link) => {
            return {
                linkUrl: resolveLink(link, config)
            };
        },
        contentItemResolver: (itemId, contentItem) => {
            const resolved = {
                contentItemHtml: ''
            };
            const resolver = componentsResolvers.find((componentsResolver) => componentsResolver.type === contentItem.system.type);
            if (resolver) {
                resolved.contentItemHtml = resolver.template(contentItem, config).trim();
            }
            return resolved;
        }
    });

    element.value = resolved.html;
    element.value = enhanceMarkup(element, config);
    return element;
};

const resolveRichText = (response, config) => {
    if (!response.items) return response;

    response.items.forEach((item) => {
        Object.keys(item.elements).forEach((key) => {
            if (item.elements[key].type === 'rich_text') {
                item.elements[key] = richTextResolver(item.elements[key], response.linkedItems, config);
            }
        });
    });

    return response;
};

module.exports = {
    resolveRichText,
    templates
 };
