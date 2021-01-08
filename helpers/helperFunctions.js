const axios = require('axios');
const cache = require('memory-cache');
const cheerio = require('cheerio');
// const fs = require('fs');
// const { promisify } = require('util');
// const readFileAsync = promisify(fs.readFile);

const helper = {
    escapeHtml: (unsafe) => {
        return unsafe
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },
    escapeQuotes: (unsafe) => {
        return unsafe
            .replace(/"/g, '\\"')
    },
    escapeQuotesHtml: (unsafe) => {
        return unsafe
            .replace(/"/g, '&quot;')
    },
    removeNewLines: (unsafe) => {
        return unsafe.replace(/\r?\n|\r/g, '');
    },
    getFormValue: (formValues, fieldName) => {
        var value = '';
        if (typeof formValues !== 'undefined') {
            value = formValues[fieldName] || '';
        }
        return value;
    },
    getValidationMessages: (errors, data) => {
        errors.forEach((item) => {
            if (item.msg) {
                if (data.elements && data.elements[item.msg] && data.elements[item.msg].value) {
                    item.msg = data.elements[item.msg].value;
                }

                if (data.content && data.content[item.msg] && data.content[item.msg].value) {
                    item.msg = data.content[item.msg].value;
                }
            }
        });

        return errors;
    },
    getPrismClassName: (item) => {
        let lang;
        const pairings = {
            rest: 'shell',
            shell: 'shell',
            curl: 'shell',
            _net: 'dotnet',
            c_: 'dotnet',
            javascript: 'js',
            json: 'js',
            typescript: 'ts',
            java: 'java',
            android: 'java',
            javarx: 'java',
            php: 'php',
            swift: 'swift',
            python: 'python',
            ruby: 'ruby'
        }

        if (item && item.codename) {
            lang = pairings[item.codename];
        }

        if (!lang) {
            lang = 'clike';
        }

        return `lang-${lang}`;
    },
    stripTags: (text) => {
        return text.replace(/<\/?[^>]+(>|$)/g, '');
    },
    resolveMacros: (text) => {
        // If macro in format {@ sometext @}, replace it by icon
        let replaced = text.replace(/{@[^@]+@}/g, (match) => {
            const text = match.replace('{@', '').replace('@}', '').split('|');
            const icon = text.length ? text[0] : '';
            const tooltip = text.length > 1 ? text[1] : '';

            return `<i aria-hidden="true" class="icon ${helper.escapeHtml(icon)}">${tooltip ? `<span class="icon__tooltip">${tooltip}</span>` : ''}</i>`;
        });

        // If macro in format {~ sometext ~}, replace it by inline code
        replaced = replaced.replace(/{~[^~]+~}/g, (match) => {
            return `<code>${match.replace('{~', '').replace('~}', '')}</code>`;
        });

        return replaced;
    },
    capitalizeFirstLetter: (text) => {
        return text.charAt(0).toUpperCase() + text.slice(1)
    },
    replaceWhitespaceWithDash: (text) => {
        return text.replace(/\s/g, '-');
    },
    removeUnderscoreElems: (elems) => {
        for (let i = 0; i < elems.length; i++) {
            if (elems[i].startsWith('_')) {
                const index = elems.indexOf(elems[i]);
                if (index > -1) {
                    elems.splice(index, 1);
                }
            }
        }

        return elems;
    },
    sleep: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    hasLinkedItemOfType: (field, type) => {
        for (const item of field.linkedItems_custom) {
            if (item.type === type) {
                return true;
            }
        }
        return false;
    },
    getReferenceFiles: async (codename, saveToCache, KCDetails, methodName) => {
        let data;
        const baseURL = process.env.referenceRenderUrl;
        const time = (new Date()).toISOString();

        try {
            data = await axios.get(`${baseURL}/api/ProviderStarter?api=${codename}&isPreview=${KCDetails.isPreview ? 'true' : 'false'}&source=${KCDetails.host}&method=${methodName}&t=${time}`);
            /* data = {};
            data.data = await readFileAsync('./helpers/delivery_api.html', 'utf8'); */
        } catch (err) {
            console.err(err)
            try {
                if (baseURL) {
                    data = await axios.get(`https://${KCDetails.isPreview ? 'kcddev' : 'kcdmaster'}.blob.core.windows.net/api-reference-pages/${codename}${KCDetails.isPreview ? '-preview' : ''}.html`);
                }
            } catch (err) {
                data = {};
                data.data = '';
            }
        }

        if (saveToCache) {
            cache.put(`reDocReference_${codename}_${KCDetails.projectid}`, data);
        }
        return data;
    },
    getDomain: (protocol, host) => {
        let domain = protocol + '://' + host;

        if (domain.indexOf('kcd-web-live-master') > -1) {
            domain = protocol + '://docs.kontent.ai';
        }

        return domain;
    },
    isLiveSite: (host) => {
        if (host.indexOf('kcd-web-live-master') > -1) {
            return true;
        }
        return false;
    },
    isKenticoIP: (req) => {
        const ip = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket?.remoteAddress;
        return ip === process.env.KenticoUserIp;
    },
    showEditLink: (isPreview, isKenticoIP) => {
        return isPreview || isKenticoIP
    },
    addTitlesToLinks: (content, urlMap, articles) => {
        const $ = cheerio.load(content);
        const $links = $('a:not(.call-to-action)');

        $links.each(function () {
            const $that = $(this);
            let url = $that.attr('href').split('#')[0].replace('https://docs.kontent.ai', '');
            let codename = '';
            let title = '';

            for (let i = 0; i < urlMap.length; i++) {
                if (urlMap[i].url === url) {
                    codename = urlMap[i].codename;
                }
            }

            // Some multiplatform articles do not have represetation of their url with tech query string in urlMap
            if (!codename) {
                url = url.split('?')[0];

                for (let i = 0; i < urlMap.length; i++) {
                    if (urlMap[i].url === url) {
                        codename = urlMap[i].codename;
                    }
                }
            }

            if (codename) {
                for (let i = 0; i < articles.length; i++) {
                    if (articles[i].system.codename === codename) {
                        title = articles[i].title.value;
                    }
                }
                if (title) {
                    $that.attr('title', title);
                }
            }
        });

        const output = $.html();
        return output.replace('<html><head></head><body>', '').replace('</body></html>', '');
    },
    getCodenameByUrl: (originalUrl, urlMap) => {
        let codename = '';
        let url = originalUrl.split('#')[0];

        for (let i = 0; i < urlMap.length; i++) {
            if (urlMap[i].url === url) {
                codename = urlMap[i].codename;
            }

            if (!codename) {
                url = originalUrl.split('?')[0];
                if (urlMap[i].url === url) {
                    codename = urlMap[i].codename;
                }
            }
        }
        return codename;
    },
    generateAnchor: (text) => {
        return text.toLowerCase().replace(/(<([^>]+)>)/g, '').replace(/(&nbsp;)|(&#xa0;)|(&#160;)/g, '-').replace(/&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-f]{1,6});/g, '').replace(/\W/g, '-').replace(/[-]+/g, '-');
    },
    getPathWithoutQS: (url) => {
        return url.replace(/\?.*$/, '');
    },
    isNotEmptyRichText: (text) => {
        return text && text !== '<p><br></p>';
    },
    ensureProtocol: (url) => {
        return !/^https?:\/\//i.test(url) ? `https://${url}` : url;
    },
    isCodenameInMultipleChoice: (data, codename) => {
        let isIn = false;

        for (let i = 0; i < data.length; i++) {
            if (data[i].codename === codename) {
                isIn = true;
            }
        }

        return isIn;
    }
};

module.exports = helper;
