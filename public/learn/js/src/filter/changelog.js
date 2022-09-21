(() => {
    const pageSize = 10;
    let currentLimit = 10;
    const searchParam = helper.getParameterByName('search');
    const calendar = window.calendar.init();
    const loadMoreEl = document.querySelector('[data-filter-load-more]');

    const updateRoomUrl = (services, changes, released) => {
        const loc = window.location;
        const urlParams = new URLSearchParams(loc.search);
        const url = helperFilter.getUrl(loc);
        const qs = [];

        if (services) {
            qs.push(`show=${services}`);
        }
        if (changes === 'true') {
            qs.push(`breaking=${changes}`);
        }
        if (released === 'true') {
            qs.push(`released=${released}`);
        }
        if (searchParam) {
            qs.push(`search=${searchParam}`);
        }
        if (urlParams.has('kontent-smart-link-enabled')) {
            qs.push('kontent-smart-link-enabled');
        }

        return `${url}${qs.length ? `?${qs.join('&')}` : ''}${loc.hash}`;
    };

    const updateUrl = (services, changes, released) => {
        const url = updateRoomUrl(services, changes, released);
        if (history && history.replaceState) {
            history.replaceState({}, null, url);
        }
    };

    const getFilterProp = (prop) => {
        const item = document.querySelector(`[data-filter-group="changes"] [data-toggle="${prop}"].filter__item--active`);

        if (item) {
            return 'true';
        } else {
            return 'false';
        }
    };

    const getLimitByHash = (hash, mixerState) => {
        const matchingItems = mixerState.matching;
        let hashPosition = 0;
        const id = hash.replace('#', '');

        for (var i = 0; i < matchingItems.length; i++) {
            const heading = matchingItems[i].querySelector('h2[id]')
            if (heading.getAttribute('id') === id) {
                hashPosition = i;
                break;
            }
        }

        return parseInt(hashPosition) + pageSize;
    };

    const refreshSplideCarousel = () => {
        if (!window.splideCarousels) return;
        for (let i = 0; i < window.splideCarousels.length; i++) {
            window.splideCarousels[i].refresh();
        }
    };

    const mixer = window.mixitup('.article__body', {
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
            limit: currentLimit
        },
        callbacks: {
            onMixEnd: function () {
                const state = mixer.getState();
                updateUrl(helperFilter.getActiveItems('services'), getFilterProp('.breaking_change'), getFilterProp('.released'));
                refreshSplideCarousel();
                helperFilter.handleDropDownLabel('calendar', calendar);
                helperFilter.handleDropDownLabel('services');

                if (!loadMoreEl) return;

                if (state.activePagination.limit >= state.totalMatching) {
                    loadMoreEl.setAttribute('disabled', 'disabled');
                } else if (loadMoreEl.disabled) {
                    loadMoreEl.removeAttribute('disabled');
                }
            }
        }
    });

    const setFilterOnLoad = (url) => {
        const show = helper.getParameterByName('show', url);
        const breaking = helper.getParameterByName('breaking', url);
        const released = helper.getParameterByName('released', url);
        const hash = window.location.hash;

        helperFilter.setFilterOnLoad(show, 'services');

        let itemB;
        if (breaking === 'true') {
            itemB = document.querySelector('[data-filter-group="changes"] [data-toggle=".breaking_change"]');
        }
        if (itemB) {
            itemB.click();
        }
        let itemR;
        if (released === 'true') {
            itemR = document.querySelector('[data-filter-group="changes"] [data-toggle=".released"]');
        }
        if (itemR) {
            itemR.click();
        }

        if (mixer) {
            if (hash) {
                currentLimit = getLimitByHash(hash, mixer.getState());
            }
            mixer.paginate({ limit: currentLimit });
        }
    };

    const handleLoadMoreClick = () => {
        const state = mixer.getState();
        currentLimit += pageSize;
        mixer.paginate({ limit: currentLimit });
    };

    setFilterOnLoad();

    const initDropdowns = () => {
        document.querySelectorAll('.dropdown').forEach((dropdown) => window.helperFilter.createDropDownInteractions(dropdown, mixer, calendar))
    };

    initDropdowns();
    window.helperFilter.hideDropDownsOnClick();
    loadMoreEl && loadMoreEl.addEventListener('click', handleLoadMoreClick);
})();
