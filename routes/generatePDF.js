const express = require('express');
const fs = require('fs');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const isPreview = require('../helpers/kontent/isPreview');
const helper = require('../helpers/general/helper');
const getUrlMap = require('../helpers/general/urlMap');
const cacheHandle = require('../helpers/cache/handle');
const Api2Pdf = require('api2pdf');
const a2pClient = new Api2Pdf(process.env.API2PDF_API_KEY);
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

    const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });

    const codename = helper.getCodenameByUrl(req.query.url, urlMap);
    if (!codename) return res.end();

    let baseUrl;

    if (process.env.NGROK) {
        baseUrl = process.env.NGROK;
    } else if (process.env.ALIAS_URL) {
        baseUrl = process.env.ALIAS_URL;
    } else {
        baseUrl = process.env.BASE_URL;
    }

    const pathname = req.query.url.replace(/\/$/, '').replace(/\/\?/, '-');
    const fileName = pathname.split('/').slice(-2).join('-').replace(/[\W_]+/g, '-');
    const pfdInCache = pdfIsCached(fileName);

    if (pfdInCache) {
        logRequest(req, false);
        return res.redirect(303, `${baseUrl}/learn/files/${fileName}.pdf`);
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
    const baseUrlShortened = baseUrl.replace(/^.*:\/\//i, '').replace('www.', '');
    const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAAAxCAMAAAAldlEpAAABrVBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6xKEAAAAAAAA9zKg9zKgAAAAAAAA9zKgAAAA9zKgAAAA9zKg9zKg9zKgAAAA9zKg9zKgAAAAAAAAAAAA9zKg9zKg9zKg9zKg9zKg+0q09zKg9zKg9zKgAAAA9zKg9zKg9zKgAAAA9zKgAAAA9zKg9zKg9zKg9zKg9zKg9zKgAAAA9zKg9zKg9zKg9zKg9zKg9zKg+0Kw9zKhC3rdH7cQ9zKg9zKg9zKgAAAA9zKgAAAD///8wyaIaw5g1yqUqx6BAzao+zKgmxp4jxZ0exJuW49Bj1rk5y6YyyqPW9O3O8uqi59Zc1LdO0bDh+PKe5tRCzqs+zKk4y6YtyKHt+/jC7+QXwpf8/v7o+fXV9Ozz/PrK8eiu6tuK4MqG38l73cRq2LxV07NGz63X9O60696B3sdE5b1B2LJ8J4sUAAAAYHRSTlMANjIH+Ll7DezUL/XXgnRiWwPw285VEenDHo+HOifkv5pLIxWtbT4H/vvo1LOWiyvk4NvMu6OdVk5FGPfymXRDJezBomc1Md/JrKWRfUkrFgOhhWxiTzogGw3o2saxraephKK0AAAFq0lEQVRYw8WYh1caQRCHf8DRpFdBxQAqWKMmUaMpppree98JXSImRmNP7+1vzu0Cit5Bkhch33uew7GwnzM7t/uEgvjk4eP39/QeHerbd+j6FBrN5Ggvq6Tv6kU0kLG9TMmZm2gQk2J6NYXbaAS7WVUOXkfduXSM1WI36syRXlabfagrRw4y9j8N7oi/P8tmU/KlGg+x4+jsXRCI5b+YyC+n8olFVo2r2EK0f798dXgjUBB0+qGC1ufaNo5oc/1n0om5hYW5RDrDqnESlbSRDYiQVWWuAYIapu23XTGNWACMk0o/eyzzNrfMqtF7GRVoyY4Y7eJhJNyiBeAM+VtaNcAJMxnsMWB8gN/WOY1NA4YgOuySZLeHIPCFWwcBDEYh08c4ye+PBR/zrCrntwrEdBTg0VlyS2QALKb2HqJxtJOMDWGydNMJGMnj7iGpo4M4Psh0mMlNJFeQJAAXmGB9rijwYp1V5UB8i4DNRDyFTrID/RTCaerCBA0DV8gI7OczdJIOPRRDhMJAu6n8UckJ9FgA8ogECJIlgSdJ9mcpaCIyt/MvMHeL9WRAs1sOPASECXxuQ6utn7SgTgC8VsOmik873PKrbitwkZUEXlQIZFOzhazaM/lypYAVWmoBTBYARjlyD8uB1VLKgJ6GLRazPuqiMBfQV2QAjubuZre1KHBOKZAp5BOF3HRGReFCZQkcfJZB+QeARq62qb0k8IjEyoDASCOAiwu4ywL7acAIDy+BLNCrEMgu5z+8frU2k1dpyEPYQMNLryMJITqtiUk9RnTzVDQTb8MTvvEgebVa87A8pJMLBHh1Io5o/O49vmomDGQJgZoxxRQCS8n3IvqcU6bgVEUJpC6eTDLASUTtTUBxRZiAqJXk2xGJyOKAUQrLAlI/EHMTaeM/fsKlJ/LayAuTGdeUAolMMVrLF5iCWyjj6tCJlgrJYZuGh35/+QKN6Pe2NjHOKF/FxaiZAI7c5vbyO6FBdPgxytj2LpieKUYLiRRTcAM7zMYxYH1DIPe8GH1VEziMHaZvIwPvtws85QJLy4lZlq3jyWSIlZidXRDTzq1XCGQz0+nFQjK12Q+j2GF6WYlMjr179fLl6sd8hUAm//nt6sKT6dQSK3G8bhlgi+k8m5/PzC5VCOTmS2WpXwb2MEHpRJROJ1ilQHKtGM6vsBLnsMOoHIY3BWbTr4vhp2llF4QCgUAU/8xxFYGZTYFnxXBmQ2Cs4kREpME/c5gpSCzWELhVsRkRNeGfOcmU5J+IWVcTCYXAENQFdHa9N9AS5GFk5LRXb9DJUetIGPsDXr9jZATRTq/eCTWOsu1kU9Mfnq2+efVuJaUQGFUXCHqII7UBLSTw+AGJyCaHul1ErcRxQIVDTEFmOZnOfMmuFAoKgRvqAlYiq01P5BYrw2aTiJ9UzGQhMlnRST1kkt+l4T+tAcsuJ1YShSWFwIG4qoCGiJ9FvERtUVu/T04+UYALkBTRGSFnwOPi99y6mk8CJQqB3VAVsBM1n9V3Nsup5mdtR9hKtEsI2CCzS/welwepCozVEni9VeCOuoCBikjUhS4PCfRCwLEp4BMCf5mC5FpZQJEAIVD6QgeR1WXURYPQRYgsXUFDWaCrJNBaS2CKVSU3/7L4JMyLM3F8u8CAgRPzE/U4YezUG2Aj8gIBokBNAWUjqJPJz39beLP6tLgXTKISDZXpFzXo5qHLx1tQKt71EtkhExA94VRfhLWLkM3k8oUvi/K+LPahKgIjgN0k6j4Bo140/ACRBHNJwFsWkKoJXDrA1BFb5Ip8MFH5D4VRUybIX407fYPgtDl9E8C4rwmDGs0EZEJiiF+j0aIaU+y37EVdOXngd/PHUV+O9LFajKL+HGfVOYxGMHaKqbPvIhrD5Wtq/XjsAhrI2IOtq3Ho0E00mEtju/f1DR09ePTU3jPnJ+OoM78A+jx0aROX6r0AAAAASUVORK5CYII=';
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
                    <a href="${baseUrl}" style="color:silver;">${baseUrlShortened}</a>
                </div>
                <div style="display:inline-block;width:49%;text-align:right;">
                    <span class="pageNumber"></span> of <span class="totalPages"></span>
                </div>
            </div>`
    };

    a2pClient.headlessChromeFromUrl(`${baseUrl}${url}`, true, `${fileName}.pdf`, options)
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
            return res.redirect(303, `${baseUrl}/learn/files/${fileName}.pdf`);
        })
}));

module.exports = router;
