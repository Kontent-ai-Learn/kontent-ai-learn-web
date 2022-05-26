(function () {
    var pageSize = 10;
    var searchParam = helper.getParameterByName('search');

    var updateRoomUrl = function (services, changes, page) {
        var loc = window.location;
        var urlParams = new URLSearchParams(loc.search);
        var url = helperFilter.getUrl(loc);
        var qs = [];
        page = parseInt(page);

        if (services) {
            qs.push(`show=${services}`);
        }
        if (changes === 'true') {
            qs.push(`breaking=${changes}`);
        }
        if (page > 1) {
            qs.push(`page=${page}`);
        }
        if (searchParam) {
            qs.push(`search=${searchParam}`);
        }
        if (urlParams.has('kontent-smart-link-enabled')) {
            qs.push('kontent-smart-link-enabled');
        }

        return `${url}${qs.length ? `?${qs.join('&')}` : ''}${loc.hash}`;
    };

    var updateUrl = function (services, changes, page) {
        var url = updateRoomUrl(services, changes, page);
        if (history && history.replaceState) {
            history.replaceState({}, null, url);
        }
    };

    var getBreaking = function () {
        var item = document.querySelector('[data-filter-group="changes"] .filter__item--active');

        if (item && item.getAttribute('data-filter') === '.breaking_change') {
            return 'true';
        } else {
            return 'false';
        }
    };

    var getPageByHash = function (hash) {
        var headings = document.querySelectorAll('.article__content h2[id]');
        var hashPosition = 0;
        var page = 1;
        var id = hash.replace('#', '');

        for (var i = 0; i < headings.length; i++) {
            if (headings[i].getAttribute('id') === id) {
                hashPosition = i;
            }
        }

        page = parseInt(hashPosition / pageSize + 1);
        return page;
    };

    var refreshSplideCarousel = function () {
        if (!window.splideCarousels) return;
        for(let i = 0; i < window.splideCarousels.length; i++) {
            window.splideCarousels[i].refresh();
        }
    };

    var mixer = window.mixitup('.article__body', {
        animation: {
            enable: false
        },
        classNames: {
            modifierActive: ' filter__item--active'
        },
        multifilter: {
            enable: true
        },
        pagination: {
            limit: pageSize,
            hidePageListIfSinglePage: true,
        },
        templates: {
            pagerPrev: '<button type="button" class="filter__prev" data-page="prev"></button>',
            pagerNext: '<button type="button" class="filter__next" data-page="next"></button>'
        },
        callbacks: {
            onMixEnd: function () {
                var state = mixer.getState();
                updateUrl(helperFilter.getActiveItems('services'), getBreaking(), state.activePagination.page);
                refreshSplideCarousel();
            }
        }
    });

    var setFilterOnLoad = function (url) {
        var show = helper.getParameterByName('show', url);
        var breaking = helper.getParameterByName('breaking', url);
        var page = parseInt(helper.getParameterByName('page', url)) || 1;
        var hash = window.location.hash;

        if (hash && page <= 1) {
            page = getPageByHash(hash);
        }

        helperFilter.setFilterOnLoad(show, 'services');

        var item;
        if (breaking === 'true') {
            item = document.querySelector('[data-filter-group="changes"] [data-filter=".breaking_change"]');
        } else {
            item = document.querySelector('[data-filter-group="changes"] [data-filter=".all_changes"]');
        }
        if (item) {
            item.click();
        }

        if (mixer) {
            mixer.paginate(page);
        }
    };

    setFilterOnLoad();
})();
