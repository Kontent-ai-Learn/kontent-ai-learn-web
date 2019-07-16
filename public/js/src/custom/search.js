/**
 * Initializes Algolia search with use of autocomplete.js
 */

(() => {
    // Get Algolia API details from object in the global scope (should be present in the page head)
    // Or use API detail injected with url parameters
    searchAPI.appid = helper.getParameterByName('searchappid') || searchAPI.appid;
    searchAPI.apikey = helper.getParameterByName('searchapikey') || searchAPI.apikey;
    searchAPI.indexname = helper.getParameterByName('searchindexname') || searchAPI.indexname;

    const client = algoliasearch(searchAPI.appid, searchAPI.apikey);
    const tutorials = client.initIndex(searchAPI.indexname);
    const url = window.location;
    const searchWrapper = document.querySelector('.navigation__search-wrapper');
    const searchOverlay = document.querySelector('.search-overlay');
    const navigation = document.querySelector('.navigation');
    let searchTerm = '';
    let searchResultSelected = false;
    let searchResultsNumber = 0;
    let searchInput = document.querySelector('#nav-search');
    let isClampSupported = (typeof CSS !== 'undefined' && CSS.supports('-webkit-line-clamp', '2'));
    let clampDelay = 0;

    // Get injected KC API details
    const projectIdUrl = helper.getParameterByName('projectid');
    const previewApiKeyUrl = helper.getParameterByName('previewapikey');

    // Build query string with injected KC API details for the urlMap
    const queryString = (() => {
        let qString = '';
        qString += (typeof projectIdUrl !== 'undefined' && projectIdUrl !== null) ? `projectid=${projectIdUrl}&` : '';
        qString += (typeof previewApiKeyUrl !== 'undefined' && previewApiKeyUrl !== null) ? `previewapikey=${previewApiKeyUrl}&` : '';
        qString = qString.slice(0, -1);
        qString = qString ? `?${qString}` : '';
        return qString;
    })();

    const arrowPress = (e) => {
        e = e || window.event;
        if (e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 37 || e.keyCode === 39) {
            searchInput.value = decodeURIComponent(searchTerm);
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

    const formatSuggestionContent = (suggestion) => {
        // Get content with highlighted markup
        let content = suggestion._highlightResult.content.value;

        if (!content) {
            console.log(suggestion);
        }

        // Remove inline icon, code macros and newlines
        content = removeInlineElements(content);

        // Get start and end indexes of the first highlighted match
        let indexStart = content.indexOf('<em>');
        let indexEnd = content.lastIndexOf('</em>') + 5;

        // Get highlighted string
        let highlighted = content.substring(indexStart, indexEnd);

        // Number of chars before and after the highlighted string to be rendered
        let numCharsBefore = 20;
        let numCharsAfter = 150;

        // Get desired number of chars before and after
        let contentBefore = content.substring(indexStart - numCharsBefore, indexStart);
        let contentAfter = content.substring(indexEnd, indexEnd + numCharsAfter);

        // Add hellip before the text in case the highlighed string is somewhere in the the middle of the search result content
        if (contentBefore.length === numCharsBefore) {
            contentBefore = `&hellip;${contentBefore}`;
        }

        // Strip tags and unfinished tags at the end of the sting in after text
        contentAfter = contentAfter.replace(/(<([^>]+)>)/ig, '');
        contentAfter = contentAfter.replace(/(<([^>]+)$)/ig, '');

        // Add hellip after the text in case the highlighed string is somewhere in the the middle of the search result content
        if (contentAfter.length === numCharsAfter) {
            contentAfter = `${contentAfter}&hellip;`;
        }

        suggestion._highlightResult.content.value = `${contentBefore}${highlighted}${contentAfter}`;

        return suggestion;
    };

    const htmlEntities = (str) => {
        return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/&lt;em&gt;/g, '<em>').replace(/&lt;\/em&gt;/g, '</em>');
    };

    const formatSuggestion = (suggestion, urlMap) => {
        // Store current search input value for use of querystring that is used in Google Analytics search terms
        searchTerm = encodeURIComponent(searchInput.value);

        // Get url from the urlMap
        const suggestionUrl = urlMap.filter(item => item.codename === suggestion.codename);

        // Add an anchor to the url if available
        const anchor = suggestion._highlightResult.heading.value ? `#a-${suggestion._highlightResult.heading.value.replace(/<\/?[^>]+(>|$)/g, '').toLowerCase().replace(/\W/g, '-')}` : '';
        suggestion.resolvedUrl = suggestionUrl.length ? `${suggestionUrl[0].url}${anchor}` : '';

        // Template for a single search result suggestion
        return `<a href="${suggestion.resolvedUrl}" class="suggestion">
                    <div class="suggestion__left">
                        <span class="suggestion__heading">${removeInlineElements(suggestion._highlightResult.title.value)}</span>
                        ${suggestion._highlightResult.heading.value ? '<span class="suggestion__sub-heading">'+ removeInlineElements(suggestion._highlightResult.heading.value) +'</span>' : ''}
                        <p class="suggestion__text">${htmlEntities(suggestion._highlightResult.content.value)}</p>
                    </div>
                    <div class="suggestion__right">
                        <span class="suggestion__category">Tutorials</span>
                    </div>
                </a>`;
    };

    const formatEmptySuggestion = () => {
        searchTerm = encodeURIComponent(searchInput.value);

        // Template for a empty result
        return `<div class="suggestion suggestion--empty">
                    <span class="suggestion__heading">${UIMessages ? UIMessages.searchNoResults : ''}</span>
                </div>`;
    };

    const onAutocompleteSelected = (suggestion, context) => {
        searchResultSelected = true;
        searchInput.value = decodeURIComponent(searchTerm);

        logSearchTermSelected(searchTerm, suggestion.resolvedUrl);
        logSearchTermNumber(searchTerm);

        // Do nothing on click, as the browser will handle <a> tag by default
        if (context.selectionMethod === 'click') {
            return;
        }

        // Change the page (for example, when enter key gets hit)
        window.location.assign(`${suggestion.resolvedUrl}`);
    };

    const clampItem = (item) => {
        setTimeout(() => {
            $clamp(item, { clamp: 2 });
        }, clampDelay);
    };

    let prevSearchTerm = searchTerm;
    let searchScrolled = false;

    const onAutocompleteUpdated = () => {
        setTimeout(() => {
            document.querySelector('.aa-dropdown-menu').scrollTop = 0; // Set scroll position to top
            let searchSummaries = document.querySelectorAll('.suggestion__text');
            let length = searchSummaries.length <= 4 ? searchSummaries.length : 4;
            prevSearchTerm = searchTerm;
            searchScrolled = false;

            // Clamp only items that are visible without scrolling for performance reasons.
            for (var i = 0; i < length; i++) {
                clampItem(searchSummaries[i]);
            }
        }, 0);
    };

    const optimizeClamping = () => {
        document.querySelector('.aa-dropdown-menu').addEventListener('scroll', () => {
            setTimeout(() => {
                if (prevSearchTerm === searchTerm && !searchScrolled) {
                    searchScrolled = true;
                    let searchSummaries = document.querySelectorAll('.suggestion__text');
                    let length = searchSummaries.length <= 4 ? searchSummaries.length : 4;

                    for (var i = length; i < searchSummaries.length; i++) {
                        clampItem(searchSummaries[i]);
                    }
                }
            }, 0);
        }, supportsPassive ? {
            passive: true
        } : false);
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
        }
    };

    const onAutocompleteOpened = () => {
        if (searchWrapper && searchOverlay) {
            navigation.classList.add('navigation--search-active');
            searchWrapper.classList.add('navigation__search-wrapper--wide');
            searchOverlay.classList.add('search-overlay--visible');
        }
        searchInput.focus();

        if (searchTerm !== '' && !isClampSupported && searchWrapper) {
            clampDelay = 250;

            setTimeout(() => {
                clampDelay = 0;
            }, 250);
        } else {
            clampDelay = 0;
        }
    };

    const getSuggestionsSource = (hitsSource, query, callback) => {
        hitsSource(query, (suggestions) => {
            searchResultsNumber = suggestions.length;
            let formattedSuggestions = [];

            for (let i = 0; i < suggestions.length; i++) {
                formattedSuggestions.push(formatSuggestionContent(suggestions[i]))
            }
            callback(formattedSuggestions);
        });
    };

    // Init Algolia
    const initAutocomplete = (urlMap) => {
        // Init autocomplete and set maximum of suggested search items
        var hitsSource = autocomplete.sources.hits(tutorials, {
            hitsPerPage: 1000
        });

        let searchInputIsFocused = false;
        if (searchInput === document.activeElement) {
            searchInputIsFocused = true;
        }

        autocomplete('#nav-search', {
                autoselect: true,
                openOnFocus: true,
                clearOnSelected: false,
                debug: false
            }, [{
                source: (query, callback) => {
                    getSuggestionsSource(hitsSource, query, callback);
                },
                displayKey: 'title',
                templates: {
                    header: () => {
                        return `<div class="aa-header">${searchResultsNumber} results for '<strong>${decodeURIComponent(searchTerm)}</strong>'</div>`;
                    },
                    suggestion: (suggestion) => {
                        return formatSuggestion(suggestion, urlMap);
                    },
                    empty: () => {
                        return formatEmptySuggestion();
                    }
                }
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

    const logSearchTermErased = () => {
        window.dataLayer.push({
            'event': 'event',
            'eventCategory': 'search--used',
            'eventAction': decodeURIComponent(searchTerm),
            'eventLabel': 'Not clicked'
        });
    };

    const logSearchTermNumber = (term) => {
        window.dataLayer.push({
            'event': 'event',
            'eventCategory': 'search--searched-result',
            'eventAction': decodeURIComponent(term),
            'eventLabel': searchResultsNumber
        });
    };

    const logSearchTermSelected = (term, url) => {
        window.dataLayer.push({
            'event': 'event',
            'eventCategory': 'search--used',
            'eventAction': decodeURIComponent(term),
            'eventLabel': url
        });
    };

    const initAlgoliaSearch = () => {
        document.onkeydown = arrowPress;

        // Get urlMap and init the autocomplete
        helper.ajaxGet(`${url.protocol}//${url.hostname + (location.port ? ':' + location.port : '')}/urlmap${queryString}`, (urlMap) => {
            initAutocomplete(urlMap);
            optimizeClamping();
        }, 'json');
    };

    const setFocusOnMagnifier = (prefix) => {
        let search = document.querySelector(`.${prefix}__search`);
        if (search) {
            let icon = search.querySelector(`.${prefix}__search-icon`);
            icon.addEventListener('click', () => {
                searchInput.focus();
            });
        }
    };

    if (searchAPI) {
        initAlgoliaSearch();
        setFocusOnMagnifier('navigation');
        setFocusOnMagnifier('hero');
    }
})();
