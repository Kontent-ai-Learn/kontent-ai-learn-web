(() => {
    const url = window.location;

    // Get injected KC API details
    const projectIdUrl = window.helper.getParameterByName('projectid');
    const previewApiKeyUrl = window.helper.getParameterByName('previewapikey');

    // Build query string with injected KC API details for the urlMap
    const queryString = (() => {
        let qString = '';
        qString += (typeof projectIdUrl !== 'undefined' && projectIdUrl !== null) ? `projectid=${projectIdUrl}&` : '';
        qString += (typeof previewApiKeyUrl !== 'undefined' && previewApiKeyUrl !== null) ? `previewapikey=${previewApiKeyUrl}&` : '';
        qString = qString.slice(0, -1);
        qString = qString ? `?${qString}` : '';
        return qString;
    })();

    window.helper.ajaxGet(`${url.protocol}//${url.hostname + (location.port ? ':' + location.port : '')}${window.helper.setUrlPathPrefix()}/urlmap${queryString}`, (urlMap) => {
        window.urlMap = urlMap;

        if (window.initSearch) {
            window.initSearch();
        }
        if (window.initMultitechQS) {
            window.initMultitechQS();
        }
        if (window.initTerminology) {
            window.initTerminology();
        }
        if (window.initSmartLink && document.querySelector('body').classList.contains('preview-key')) {
            window.initSmartLink();
        }
    }, 'json');
})();
