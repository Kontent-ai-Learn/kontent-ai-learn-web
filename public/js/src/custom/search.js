/**
 * Obsolete for this project
 * Initializes Algolia search with use of autocomplete.js
 */

window.initSearch = (() => {
    // Get Algolia API details from object in the global scope (should be present in the page head)
    // Or use API detail injected with url parameters
    window.searchAPI.appid = window.helper.getParameterByName('searchappid') || window.searchAPI.appid;
    window.searchAPI.apikey = window.helper.getParameterByName('window.searchAPIkey') || window.searchAPI.apikey;
    window.searchAPI.indexname = window.helper.getParameterByName('searchindexname') || window.searchAPI.indexname;

    const client = window.algoliasearch(window.searchAPI.appid, window.searchAPI.apikey);
    const searchIndexName = client.initIndex(window.searchAPI.indexname);
    const searchWrapper = document.querySelector('.navigation__search-wrapper');
    const searchOverlay = document.querySelector('.search-overlay');
    const searchTrigger = document.querySelector('[data-search-trigger]');
    const searchTarget = document.querySelector('[data-search-target]');
    const navigation = document.querySelector('.navigation');
    let searchTerm = '';
    let searchResultSelected = false;
    let searchResultsNumber = 0;
    const searchInput = document.querySelector('#nav-search');

    const arrowPress = (e) => {
        e = e || window.event;
        if (e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 37 || e.keyCode === 39) {
            searchInput.value = window.filterXSS(decodeURIComponent(searchTerm));
        }
    };

    const removeInlineElements = (content) => {
        if (content) {
            content = content.replace(/{@[a-z,0-9,-</>]+@}/g, '');
            content = content.replace(/{~[^~]+~}/g, '');
            content = content.replace(/\r?\n|\r/g, ' ');
        }
        return content;
    };

    const formatSuggestion = (suggestion) => {
        // Store current search input value for use of querystring that is used in Google Analytics search terms
        searchTerm = encodeURIComponent(searchInput.value);

        // Get url from the urlMap
        const suggestionUrl = window.urlMap.filter(item => item.codename === suggestion.codename);

        // Add an anchor to the url if available
        let anchor = suggestion._highlightResult.title.value ? `#a-${suggestion._highlightResult.title.value.replace(/<\/?[^>]+(>|$)/g, '').toLowerCase().replace(/\W/g, '-').replace(/[-]+/g, '-')}` : '';
        // Keep anchors only for references, changelog, and terminology
        if (suggestion.codename !== 'terminology' && suggestion.codename !== 'product_changelog') {
            anchor = '';
        }
        const tech = suggestion.platforms && suggestion.platforms.length === 1 ? `?tech=${window.helper.getTech(suggestion.platforms[0])}` : '';
        suggestion.resolvedUrl = suggestionUrl.length ? `${suggestionUrl[0].url}${suggestionUrl[0].url.indexOf('?tech') === -1 ? tech : ''}${suggestion.section !== 'API' ? anchor : ''}` : '';
        let section = (suggestion.section === 'tutorials' && suggestion.resolvedUrl.includes('/reference/')) ? 'reference' : suggestion.section;

        if (section.toLowerCase() === 'api') {
            section = 'Reference';
        }

        // Custom general label for tutorials
        if (suggestion.section === 'tutorials') {
            section = 'Tutorial'
        }

        // Custom label for terminology page
        if (suggestion.codename === 'terminology') {
            section = 'Terminology'
        }

        // Custom label for product changelog
        if (suggestion.codename === 'product_changelog') {
            section = 'Changelog'
        }

        // Template for a single search result suggestion
        return `<a href="${suggestion.resolvedUrl}" class="suggestion">
                    <div class="suggestion__left">
                        <span class="suggestion__heading">${removeInlineElements(suggestion._highlightResult.title.value)}</span>
                        ${suggestion._highlightResult.heading.value ? '<span class="suggestion__sub-heading">'+ removeInlineElements(suggestion._highlightResult.heading.value) +'</span>' : ''}
                        <p class="suggestion__text">${removeInlineElements(suggestion._snippetResult.content.value)}</p>
                    </div>
                    <div class="suggestion__right">
                        <span class="suggestion__category suggestion__category--${section.toLowerCase()}">${section.toUpperCase()}</span>
                    </div>
                </a>`;
    };

    const formatEmptySuggestion = () => {
        searchTerm = encodeURIComponent(searchInput.value);

        // Template for a empty result
        return `<div class="suggestion suggestion--empty">
                    <span class="suggestion__heading">${window.UIMessages ? window.UIMessages.searchNoResults : ''}</span>
                </div>`;
    };

    const logSearchTermNumber = (term) => {
        if (window.dataLayer) {
            window.dataLayer.push({
                event: 'event',
                eventCategory: 'search--searched-result',
                eventAction: window.filterXSS(decodeURIComponent(term)),
                eventLabel: searchResultsNumber
            });
        }
    };

    const logSearchTermErased = () => {
        if (window.dataLayer) {
            window.dataLayer.push({
                event: 'event',
                eventCategory: 'search--used',
                eventAction: window.filterXSS(decodeURIComponent(searchTerm)),
                eventLabel: 'Not clicked'
            });
        }
    };

    const logSearchTermSelected = (term, url) => {
        if (window.dataLayer) {
            window.dataLayer.push({
                event: 'event',
                eventCategory: 'search--used',
                eventAction: decodeURIComponent(term),
                eventLabel: url
            });
        }
    };

    const onAutocompleteSelected = (suggestion, context) => {
        searchResultSelected = true;
        searchInput.value = window.filterXSS(decodeURIComponent(searchTerm));

        logSearchTermSelected(searchTerm, suggestion.resolvedUrl);
        logSearchTermNumber(searchTerm);

        // Do nothing on click, as the browser will handle <a> tag by default
        if (context.selectionMethod === 'click') {
            return;
        }

        // Change the page (for example, when enter key gets hit)
        window.location.assign(`${suggestion.resolvedUrl}`);
    };

    const onAutocompleteUpdated = () => {
        setTimeout(() => {
            document.querySelector('.aa-dropdown-menu').scrollTop = 0; // Set scroll position to top
        }, 0);
    };

    const triggerSearchPanel = () => {
        if (searchTrigger) {
            searchTrigger.addEventListener('click', () => {
                if (!searchTrigger.classList.contains('trigger-active')) {
                    searchTrigger.classList.add('trigger-active');
                    searchTarget.classList.add('toggle-active');
                    const input = searchTarget.querySelector('#nav-search');

                    if (input) {
                        setTimeout(() => {
                            input.focus();
                        }, 100);
                    }
                }
            });
        }
    };

    const onAutocompleteClosed = () => {
        if (searchTerm !== '' && !searchResultSelected) {
            logSearchTermNumber(searchTerm);
            logSearchTermErased();
        }

        if (searchWrapper && searchOverlay) {
            navigation.classList.remove('navigation--search-active');
            searchWrapper.classList.remove('navigation__search-wrapper--wide');
            searchOverlay.classList.remove('search-overlay--visible');

            setTimeout(() => {
                if (searchTrigger) {
                    searchTrigger.classList.remove('trigger-active');
                    searchTarget.classList.remove('toggle-active');
                }
            }, 100);
        }
    };

    const onAutocompleteOpened = () => {
        if (searchWrapper && searchOverlay) {
            navigation.classList.add('navigation--search-active');
            searchWrapper.classList.add('navigation__search-wrapper--wide');
            searchOverlay.classList.add('search-overlay--visible');
        }
        searchInput.focus();
    };

    const getSuggestionsSource = (hitsSource, query, callback) => {
        hitsSource(query, (suggestions) => {
            searchResultsNumber = suggestions.length;

            callback(suggestions);
        });
    };

    const autocompleteSettings = {
        autoselect: true,
        openOnFocus: true,
        clearOnSelected: false,
        debug: false
    };

    const getAutocompleteTemplates = () => {
        return {
            header: () => {
                return `<div class="aa-header">Showing ${searchResultsNumber} results for '<strong>${window.filterXSS(decodeURIComponent(searchTerm))}</strong>'</div>`;
            },
            suggestion: (suggestion) => {
                return formatSuggestion(suggestion);
            },
            empty: () => {
                return formatEmptySuggestion();
            }
        };
    };

    // Init Algolia
    const initAutocomplete = () => {
        // Init autocomplete
        var hitsSource = window.autocomplete.sources.hits(searchIndexName, {});

        let searchInputIsFocused = false;
        if (searchInput === document.activeElement) {
            searchInputIsFocused = true;
        }

        window.autocomplete('#nav-search', autocompleteSettings, [{
                source: (query, callback) => {
                    getSuggestionsSource(hitsSource, query, callback);
                },
                displayKey: 'title',
                templates: getAutocompleteTemplates()
            }])
            .on('autocomplete:opened', onAutocompleteOpened)
            .on('autocomplete:selected', (event, suggestion, dataset, context) => {
                onAutocompleteSelected(suggestion, context);
            })
            .on('autocomplete:closed', onAutocompleteClosed)
            .on('autocomplete:updated', onAutocompleteUpdated)

        if (searchInputIsFocused) {
            searchInput.focus();
        }
    };

    const initErrorSearch = () => {
        const container = document.querySelector('[data-error-search]');
        const title = document.querySelector('[data-error-search-title]');
        if (!container) return;

        const searchTerm = window.location.pathname.split('/').pop().replace(/-/g, ' ');

        searchIndexName.search(searchTerm).then(({ hits }) => {
            const iterations = hits.length > 5 ? 5 : hits.length;
            if (iterations > 0) {
                let suggestionsHTML = '<ul>';

                for (let i = 0; i < iterations; i++) {
                    const suggestionUrl = window.urlMap.filter(item => item.codename === hits[i].codename);
                    if (suggestionUrl.length) {
                        hits[i].resolvedUrl = suggestionUrl[0].url;
                    }

                    suggestionsHTML += `<li><a href="${hits[i].resolvedUrl}">${hits[i].title}</a></li>`;
                }

                suggestionsHTML += '</ul>';
                title.setAttribute('data-error-search-title', 'visible');
                container.innerHTML = suggestionsHTML;
            }
        });
    };

    const initAlgoliaSearch = () => {
        document.onkeydown = arrowPress;

        initAutocomplete();
        initErrorSearch();
    };

    const setFocusOnMagnifier = (prefix) => {
        const search = document.querySelector(`.${prefix}__search`);
        if (search) {
            const icon = search.querySelector(`.${prefix}__search-icon`);
            icon.addEventListener('click', () => {
                searchInput.focus();
            });
        }
    };

    return () => {
        if (window.searchAPI) {
            initAlgoliaSearch();
            setFocusOnMagnifier('navigation');
            setFocusOnMagnifier('hero');
            triggerSearchPanel();
        }
    }
})();
