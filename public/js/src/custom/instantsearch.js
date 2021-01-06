/**
 * Initializes Algolia search with use of instantsearch.js
 */

window.initSearch = (() => {
  searchAPI.appid = window.helper.getParameterByName('searchappid') || searchAPI.appid;
  searchAPI.apikey = window.helper.getParameterByName('searchAPIkey') || searchAPI.apikey;
  searchAPI.indexname = window.helper.getParameterByName('searchindexname') || searchAPI.indexname;

  let searchTerm = '';
  let searchResultsNumber = 0;
  const body = document.querySelector('body');
  const navigation = document.querySelector('.navigation');
  const searchWrapper = document.querySelector('.navigation__search-wrapper');
  const searchOverlay = document.querySelector('.search-overlay');
  const searchTrigger = document.querySelector('[data-search-trigger]');
  const searchTarget = document.querySelector('[data-search-target]');
  const searchInput = document.querySelector('#nav-search');
  let searchAutocomplete = null;
  let searchAutocompleteList = null;
  let searchAutocompleteHeader = null;
  let searchQueryID = null;
  let searchIndice = null;

  const searchClient = algoliasearch(searchAPI.appid, searchAPI.apikey);
  const search = instantsearch({
    indexName: searchAPI.indexname,
    searchClient
  });
  window.aa('init', {
    appId: searchAPI.appid,
    apiKey: searchAPI.apikey
  });
  const insightsMiddleware = instantsearch.middlewares.createInsightsMiddleware({
    insightsClient: window.aa,
  });
  search.use(insightsMiddleware);

  const removeInlineElements = (content) => {
    if (content) {
      content = content.replace(/{@[a-z,0-9,-</>]+@}/g, '');
      content = content.replace(/{~[^~]+~}/g, '');
      content = content.replace(/\r?\n|\r/g, ' ');
    }
    return content;
  };

  const formatSuggestion = (suggestion, position) => {
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
    return `<li class="autocomplete__suggestion"
                data-insights-object-id="${suggestion.objectID}"
                data-insights-position="${position + 1}"
                data-insights-query-id="${searchQueryID}"
            >
              <a href="${suggestion.resolvedUrl}" class="suggestion">
                <div class="suggestion__left">
                  <span class="suggestion__heading">${removeInlineElements(suggestion._highlightResult.title.value)}</span>
                  ${suggestion._highlightResult.heading.value ? '<span class="suggestion__sub-heading">'+ removeInlineElements(suggestion._highlightResult.heading.value) +'</span>' : ''}
                  <p class="suggestion__text">${removeInlineElements(suggestion._snippetResult.content.value)}</p>
                </div>
                <div class="suggestion__right">
                  <span class="suggestion__category suggestion__category--${section.toLowerCase()}">${section.toUpperCase()}</span>
                </div>
              </a>
            </li>`;
  };

  const formatEmptySuggestion = () => {
    searchTerm = encodeURIComponent(searchInput.value);

    // Template for a empty result
    return `<div class="suggestion suggestion--empty">
                <span class="suggestion__heading">${window.UIMessages ? window.UIMessages.searchNoResults : ''}</span>
            </div>`;
  };

  const formatHeader = () => {
    return `Showing ${searchResultsNumber} results for <strong>'${searchTerm}'</strong>`;
  };

  // Helper for the render function
  const renderIndexListItem = ({ hits, sendEvent }) => {
    return `
      ${hits.map((hit, position) => {
        return formatSuggestion(hit, position)
    }).join('')}`
  };

  const enableSearchTrigger = () => {
    searchTrigger.classList.add('trigger-active');
    searchTarget.classList.add('toggle-active');
    searchOverlay.classList.add('search-overlay--visible');
    const input = searchTarget.querySelector('#nav-search');

    if (input) {
      setTimeout(() => {
        input.focus();
      }, 100);
    }
  };

  const disableSearchTrigger = () => {
    setTimeout(() => {
      searchTrigger.classList.remove('trigger-active');
      searchTarget.classList.remove('toggle-active');
      searchOverlay.classList.remove('search-overlay--visible');
    }, 100);
  };

  const triggerSearchPanel = () => {
    if (searchTrigger && searchOverlay) {
      searchTrigger.addEventListener('click', () => {
        if (!searchTrigger.classList.contains('trigger-active')) {
          enableSearchTrigger();
        } else {
          disableSearchTrigger();
        }
      });
    }
  };

  const onAutocompleteClosed = () => {
    if (searchWrapper && searchOverlay) {
      navigation.classList.remove('navigation--search-active');
      searchWrapper.classList.remove('navigation__search-wrapper--wide');
    }
    if (searchAutocomplete) {
      searchAutocomplete.classList.remove('autocomplete__dropdown--visible');
    }
  };

  const onAutocompleteOpened = () => {
    if (searchWrapper && searchOverlay) {
      navigation.classList.add('navigation--search-active');
      searchWrapper.classList.add('navigation__search-wrapper--wide');
    }
    if (searchAutocomplete && searchTerm) {
      searchAutocomplete.classList.add('autocomplete__dropdown--visible');
    }
    searchInput.focus();
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

  const setSearchResultSelected = () => {
    body.addEventListener('click', function (e) {
      const parent = window.helper.findAncestor(e.target, '[data-search-container]');
      const parentTrigger = e.target.matches('[data-search-trigger]');

      if (!parent && !parentTrigger) {
        onAutocompleteClosed();

        if (searchTrigger && searchOverlay) {
          disableSearchTrigger();
        }
      }
    });
  };

  const trackAlogiaEvent = (e) => {
    e.preventDefault();
    const parent = window.helper.findAncestor(e.target, '.autocomplete__suggestion');
    const elem = !parent ? (e.target.matches('.autocomplete__suggestion') ? e.target : null) : parent;

    if (elem) {
      const hitItem = searchIndice.hits.find(item => item.objectID === elem.getAttribute('data-insights-object-id'));
      if (hitItem) {
        hitItem.__queryID = searchQueryID;
        hitItem.__position = parseInt(elem.getAttribute('data-insights-position'))
        searchIndice.sendEvent('click', hitItem, 'Search clicked');
      }
    }
  };

  // Create the render function
  const renderAutocomplete = (renderOptions, isFirstRender) => {
    const { indices, currentRefinement, refine, widgetParams } = renderOptions;
    searchIndice = indices[0];

    if (isFirstRender) {
      searchAutocomplete = document.createElement('div');
      searchAutocomplete.classList.add('autocomplete__dropdown');

      searchAutocompleteHeader = document.createElement('div');
      searchAutocompleteHeader.classList.add('autocomplete__header');
      searchAutocomplete.appendChild(searchAutocompleteHeader);

      searchAutocompleteList = document.createElement('ul');
      searchAutocomplete.appendChild(searchAutocompleteList);

      searchInput.addEventListener('input', event => {
        refine(event.currentTarget.value);
      });

      widgetParams.container.appendChild(searchAutocomplete);
      searchInput.addEventListener('focus', onAutocompleteOpened);

      body.addEventListener('click', function (e) {
        trackAlogiaEvent(e);
      });
    }

    searchResultsNumber = indices.length ? indices[0].hits.length : 0;
    searchTerm = window.filterXSS(decodeURIComponent(currentRefinement));
    searchAutocompleteHeader = widgetParams.container.querySelector('.autocomplete__header');
    searchAutocomplete = widgetParams.container.querySelector('.autocomplete__dropdown');
    searchAutocompleteList = widgetParams.container.querySelector('ul');

    if (searchResultsNumber && searchTerm) {
      searchAutocompleteHeader.innerHTML = formatHeader();
      searchInput.value = searchTerm;
      searchQueryID = indices.length ? indices[0].results.queryID : null;
      searchAutocompleteList.innerHTML = indices
        .map(renderIndexListItem)
        .join('');
      searchAutocomplete.classList.add('autocomplete__dropdown--visible');

    } else if (!searchResultsNumber && searchTerm) {
      searchAutocompleteHeader.innerHTML = formatHeader();
      searchAutocompleteList.innerHTML = formatEmptySuggestion();
    } else {
      searchAutocomplete.classList.remove('autocomplete__dropdown--visible');
      searchAutocompleteHeader.innerHTML = '';
      searchAutocompleteList.innerHTML = '';
    }
  };

  // Create the custom widget
  const customAutocomplete = instantsearch.connectors.connectAutocomplete(
    renderAutocomplete
  );

  // Instantiate the custom widget
  search.addWidgets([
    customAutocomplete({
      container: document.querySelector('[data-search-autocomplete]'),
    })
  ]);

  return () => {
    if (searchAPI) {
      setSearchResultSelected();
      search.start();
      setFocusOnMagnifier('navigation');
      setFocusOnMagnifier('hero');
      triggerSearchPanel();
    }
  }
})();
