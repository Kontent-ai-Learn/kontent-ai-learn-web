(function () {
    var updateRoomUrl = function (personas) {
        var loc = window.location;
        var urlParams = new URLSearchParams(loc.search);
        var url = loc.protocol + '//' + loc.hostname + (loc.port ? ':' + loc.port : '') + loc.pathname;
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

    var getActivePersonas = function () {
        var items = document.querySelectorAll('[data-filter-group="personas"] .filter__item--active');

        if (!items.length) {
            return '';
        }

        var codenames = [];

        for (var i = 0; i < items.length; i++) {
            codenames.push(items[i].getAttribute('data-toggle').replace('.', ''));
        }

        return codenames.join(',');
    };

    var setFilterOnLoad = function (url) {
        var show = helper.getParameterByName('show', url);

        if (show) {
            show = show.split(',');
            var items = document.querySelectorAll('[data-filter-group="personas"] .filter__item');
            for (var i = 0; i < items.length; i++) {
                var attr = items[i].getAttribute('data-toggle').replace('.', '');
                for (var j = 0; j < show.length; j++) {
                    if (attr === show[j]) {
                        items[i].click();
                    }
                }
            }
        }
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
                updateUrl(getActivePersonas());
            }
        }
    });

    setFilterOnLoad();
})();
