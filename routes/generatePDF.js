const express = require('express');
const fs = require('fs');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const isPreview = require('../helpers/isPreview');
const helper = require('../helpers/helperFunctions');
const getUrlMap = require('../helpers/urlMap');
const handleCache = require('../helpers/handleCache');
const Api2Pdf = require('api2pdf');
const a2pClient = new Api2Pdf(process.env['Api2Pdf.ApiKey']);
const download = require('download');

const logRequest = (req, api2pdfReached) => {
    const log = {
        url: req.query.url,
        timestamp: (new Date()).toISOString(),
        useragent: req.get('User-Agent'),
        referrer: req.headers.referrer || req.headers.referer,
        ip: (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim(),
        api2pdfReached: api2pdfReached
    };

    helper.logInCacheKey('generate-pdf', log);
};

const pdfIsCached = (fileName) => {
    const items = helper.getLogItemCacheKey('api2pdf-cache', 'filename', fileName);

    if (!(items && items.length)) return false;

    try {
        fs.statSync(`./public/learn/files/${fileName}.pdf`);
        return true; // file exists
    } catch (err) {
        return false;
    };
};

const pdfAddCache = async (api2pdfResult, fileName, url, urlMap) => {
    const log = {
        api2pdf: api2pdfResult,
        filename: fileName,
        timestamp: (new Date()).toISOString(),
        codename: helper.getCodenameByUrl(url, urlMap)
    }

    helper.logInCacheKey('api2pdf-cache', log, 9999);
};

router.get('/', asyncHandler(async (req, res, next) => {
    let url = req.query.url;

    if (!url) return res.end();

    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });

    const codename = helper.getCodenameByUrl(req.query.url, urlMap);
    if (!codename) return res.end();

    let baseURL;

    if (process.env.ngrok) {
        baseURL = process.env.ngrok;
    } else if (process.env.aliasURL) {
        baseURL = process.env.aliasURL;
    } else {
        baseURL = process.env.baseURL;
    }

    const fileName = req.query.url.split('/').slice(-2).join('-').replace(/[\W_]+/g, '-');
    const pfdInCache = pdfIsCached(fileName);

    if (pfdInCache) {
        logRequest(req, false);
        return res.redirect(303, `${baseURL}/learn/files/${fileName}.pdf`);
    }
    helper.removeLogItemCacheKey('api2pdf-cache', 'filename', fileName);

    if (url.indexOf('?') > -1) {
        url += '&';
    } else {
        url += '?';
    }

    url += 'pdf=1';

    let pdfResult;
    let error;
    const baseURLShortened = baseURL.replace(/^.*:\/\//i, '').replace('www.', '');
    const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAAArCAMAAACHO3DUAAAAdVBMVEX////nWBEAAAC/v78/Pz9/f3/51cPPz8/v7+8PDw9PT08fHx8QEBDzq4jtgUwvLy9AQECfn59vb29fX1/f39+vr6/oYh/AwMCPj49gYGD86uH99PDxmG364NL2wKXujFvqbS7rdz30tpaQkJD3y7TvjFzsdz4pYEXKAAADBUlEQVRYw8WW63qiMBCGxy+JOaGcUatbbbvt/V/iMolidS1lrSzvD2MGeOYlhyFE9Pt9NjsstjQVu1ngMJXB8+zIkqbhZXbiiSZh1jGngQio0JZIzZQCivNPKJDDm757JPUg8WOBGlbThAI64fzTCXzKv86QuNApMl14YGOIZIoky9potQEQLuss1xngBVGeJciy/AcCRYq8exdZOh+6Es4XhUUZBKyUmqrEK6VsosNTiVOtWEW5tJDyC4GnxXK5e/5GAJwkoCCIyLikYgFelgYw3RSUlhdqZdPwVE1EDqp3Cp6bWBa3vQLOnkbgaFJxKznIjegE+DdkNW0kjQ+XfQLzU+f9mzVgIboNccokY0ydBQR8xniIY4SbPoH9kMLMWWsk+kIgvS1gZUQPFDice/0ClAcDE6eA21sC5rwZrwXMbYHZYAFSYck56GPSS4EqzrgMl41zfwnU3Fl8vFJzr0D8FhmbFG/KoaBLAbLYKJ74pFi9pSiuBNbwSnG6hnZ3C7ABvx0Au6ZrgdqCbxOeL6vrKTCyDfNZYE/zoQI9Qvp2WIRGc3sNhw1XnbDzewXGh2tf6/Cyf7ohMN8dZh//88B6XRfj/+YXjU5/XTxQDyMKnHdIzxCMKbDseq/Uy/gCC/qCSQT0KmBoBF6GCEhE/Bs9nP1wASar6MHMBwp4VUgLIKVHsxgkED8oBQBFj2a+b2Lx+0aAcQDCobPIkG4EBWrnfaYMcXyT+Yzj/8h2ztkHCAgAfMxHZBO/0Uw4LukEgZzuYJAAhTkQOKH4pHHEh/tK0Qr5kQV4IlxdeCAhsm1Scxwaz1eNEGI0AQ2gZouC4kQIzmziKaQKZonLDY0mwOOtKVi0nATOFdOCSUYbAV5kMiRefxY4v7Gpi5QN6F52Xwqkq1XNZcBWRK7tVmE4bLDYRLXaKKXiNFV3H9aa/lIcd5jgP6mPu0DxG2cIMraVWXGA7uZ30yuQau52daD8fFGf42u6n+0rr4NmeXEiKiTjVLe4hLOAzGNnzTNUVjHuYV1NffwBVcwkYVmgIQ8AAAAASUVORK5CYII=';
    const domain = helper.getDomain();
    const pageUrl = `${domain}${req.query.url}`;
    const options = {
        marginBottom: 0.7,
        marginLeft: 0.8,
        marginRight: 0.8,
        marginTop: 0.8,
        displayHeaderFooter: true,
        headerTemplate: `
            <div style="font-family:Arial;width:100%;font-size:9px;padding:0 0.6in;color:silver;display:flex;">
                <div style="width:0.6in;border-right:1px solid silver;margin-right:0.1in;padding-right:0.1in;">
                    <img src="${logo}" style="width:100%;">
                </div>
                <div style="display:flex;align-items:center;">
                    ${isPreview(res.locals.previewapikey) ?
                        '<span style="color:red;">Preview</span>' :
                        `<a href="${pageUrl}" style="color:silver;">${pageUrl}</a>`}
                </div>
            </div>`,
        footerTemplate: `
            <div style="font-family:Arial;width:100%;font-size:9px;padding:0 0.6in;color:silver;">
                <div style="display:inline-block;width:49%;">
                    <a href="${baseURL}" style="color:silver;">${baseURLShortened}</a>
                </div>
                <div style="display:inline-block;width:49%;text-align:right;">
                    <span class="pageNumber"></span> of <span class="totalPages"></span>
                </div>
            </div>`
    };

    a2pClient.headlessChromeFromUrl(`${baseURL}${url}`, true, `${fileName}.pdf`, options)
        .then((result) => {
            pdfResult = result;
        }, (rejected) => {
            error = rejected
        })
        .then(async () => {
            if (error) return next();
            logRequest(req, true);
            pdfAddCache(pdfResult, fileName, req.query.url, urlMap);
            await download(pdfResult.pdf, 'public/learn/files');
            return res.redirect(303, `${baseURL}/learn/files/${fileName}.pdf`);
        })
}));

module.exports = router;
