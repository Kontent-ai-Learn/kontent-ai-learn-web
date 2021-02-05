(function () {
    var updateRoomUrl = function (personas) {
        var loc = window.location;
        var urlParams = new URLSearchParams(loc.search);
        var url = helperFilter.getUrl(loc);
        var qs = [];

        if (personas) {
            qs.push(`show=${personas}`);
        }
        if (urlParams.has('kontent-smart-link-enabled')) {
            qs.push('kontent-smart-link-enabled');
        }

        return `${url}${qs.length ? `?${qs.join('&')}` : ''}${loc.hash}`;
    };

    var updateUrl = function (personas) {
        var url = updateRoomUrl(personas);
        if (history && history.replaceState) {
            history.replaceState({}, null, url);
        }
    };

    var setFilterOnLoad = function (url) {
        var show = helper.getParameterByName('show', url);

        helperFilter.setFilterOnLoad(show, 'personas');
    };

    window.mixitup('.article__content .container', {
        animation: {
            enable: false
        },
        classNames: {
            modifierActive: ' filter__item--active'
        },
        callbacks: {
            onMixEnd: function () {
                updateUrl(helperFilter.getActiveItems('personas'));
            }
        }
    });

    setFilterOnLoad();
})();
