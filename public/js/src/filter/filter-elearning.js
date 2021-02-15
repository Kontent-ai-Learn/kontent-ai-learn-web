(function () {
    const searchParam = helper.getParameterByName('search');

    const updateRoomUrl = function (personas) {
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

        if (searchParam) {
            qs.push(`search=${searchParam}`);
        }

        return `${url}${qs.length ? `?${qs.join('&')}` : ''}${loc.hash}`;
    };

    const updateUrl = function (personas) {
        var url = updateRoomUrl(personas);
        if (history && history.replaceState) {
            history.replaceState({}, null, url);
        }
    };

    const setFilterOnLoad = function (url) {
        var show = helper.getParameterByName('show', url);

        helperFilter.setFilterOnLoad(show, 'personas');
    };

    window.mixitup('.article__content .article__body', {
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

    const setLoadedClassToIntoructionImageWrappers = () => {
        const intoructionImageWrappers = document.querySelectorAll('.article__introduction-image');
        for (let i = 0; i < intoructionImageWrappers.length; i++) {
            intoructionImageWrappers[i].classList.add('article__introduction-image--loaded');
        }
    };

    setFilterOnLoad();
    setLoadedClassToIntoructionImageWrappers();
})();
