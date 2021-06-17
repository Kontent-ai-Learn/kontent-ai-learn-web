/**
 * Initializes Algolia search with use of instantsearch.js
 */

window.initSearch = (() => {
  // Get Algolia account and index info
  searchAPI.appid = window.helper.getParameterByName('searchappid') || searchAPI.appid;
  searchAPI.apikey = window.helper.getParameterByName('searchAPIkey') || searchAPI.apikey;
  searchAPI.indexname = window.helper.getParameterByName('searchindexname') || searchAPI.indexname;

  // Define variables used throughout the search logic
  let searchResultsNumber = 0;
  let searchAutocomplete = null;
  let searchAutocompleteList = null;
  let searchAutocompleteHeader = null;
  let searchQueryID = null;
  let searchIndice = null;

  // Get DOM elements used throughout the search logic
  const body = document.querySelector('body');
  const navigation = document.querySelector('.navigation');
  const searchWrapper = document.querySelector('.navigation__search-wrapper');
  const searchOverlay = document.querySelector('.search-overlay');
  const searchTrigger = document.querySelector('[data-search-trigger]');
  const searchTarget = document.querySelector('[data-search-target]');
  const searchInput = document.querySelector('#nav-search');

  // Init Algolia IntantSearch and Algolia Analytics
  const searchClient = algoliasearch(searchAPI.appid, searchAPI.apikey);
  searchClient.searchOriginal = searchClient.search;
  searchClient.search = (requests) => {
    if (requests.every(({ params }) => !params.query)) { // Prevent sending a search query to Algolia on page load
      return Promise.resolve({
        results: requests.map(() => ({
          hits: [],
          nbHits: 0,
          nbPages: 0,
          page: 0,
          processingTimeMS: 0,
        })),
      });
    }
    return searchClient.searchOriginal(requests);
  };
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

  // Remove macros and newlines from a string
  const removeInlineElements = (content) => {
    if (content) {
      content = content.replace(/{@[a-z,0-9,-</>]+@}/g, '');
      content = content.replace(/{~[^~]+~}/g, '');
      content = content.replace(/\r?\n|\r/g, ' ');
    }
    return content;
  };

  // Get markup for a hit
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
    
    let section = "";

    if (suggestion.section.toLowerCase() === 'api') {
        section = 'Reference';
    }

    // Custom general label for tutorials
    if (suggestion.section === 'tutorials') {
        section = 'Tutorial';
    }

    if (suggestion.section === 'training') {
      section = 'E-learning';
    }

    // Custom label for terminology page
    if (suggestion.codename === 'terminology') {
        section = 'Terminology';
    }

    // Custom label for product changelog
    if (suggestion.codename === 'product_changelog') {
        section = 'Changelog';
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
                  ${suggestion._highlightResult.heading.value ? `<span class="suggestion__sub-heading">${removeInlineElements(suggestion._highlightResult.heading.value)}</span>` : ''}
                  <p class="suggestion__text">${removeInlineElements(suggestion._snippetResult.content.value)}</p>
                </div>
                <div class="suggestion__right">
                  ${section ? `<span class="suggestion__category suggestion__category--${section.toLowerCase()}">${section.toUpperCase()}</span>` : ''}
                </div>
              </a>
            </li>`;
  };

  // Get markup when no hit is available
  const formatEmptySuggestion = () => {
    // Template for a empty result
    return `<div class="suggestion suggestion--empty">
                <span class="suggestion__heading">${window.UIMessages ? window.UIMessages.searchNoResults : ''}</span>
            </div>`;
  };

  // Get markup for autocomplete header
  const formatHeader = (searchTerm) => {
    return `Showing ${searchResultsNumber} results for <strong>'${helper.encodeHTMLEntities(searchTerm)}'</strong>`;
  };

  // Render list of hits
  const renderIndexListItem = ({ hits }) => {
    return `
      ${hits.map((hit, position) => {
        return formatSuggestion(hit, position)
    }).join('')}`;
  };

  // Show search panel
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

  // Hide search panel
  const disableSearchTrigger = () => {
    setTimeout(() => {
      searchTrigger.classList.remove('trigger-active');
      searchTarget.classList.remove('toggle-active');
      searchOverlay.classList.remove('search-overlay--visible');
    }, 100);
  };

  // Toggle search panel
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

  const prefillOnLoad = () => {
    const searchValue = helper.getParameterByName('search');
    if (searchValue) {
      searchInput.value = searchValue;
      searchInput.focus();
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      if (searchTrigger) {
        searchTrigger.click();
      }
    }
  };

  // Hide autocomplete panel
  const onAutocompleteClosed = () => {
    if (searchWrapper && searchOverlay) {
      navigation.classList.remove('navigation--search-active');
      searchWrapper.classList.remove('navigation__search-wrapper--wide');
      if (searchOverlay) {
        searchOverlay.classList.remove('search-overlay--visible');
      }
    }
    if (searchAutocomplete) {
      searchAutocomplete.classList.remove('autocomplete__dropdown--visible');
    }
  };

  // Show autocomplete panel
  const onAutocompleteOpened = (searchTerm) => {
    if (searchWrapper && searchOverlay) {
      navigation.classList.add('navigation--search-active');
      searchWrapper.classList.add('navigation__search-wrapper--wide');
      if (searchOverlay) {
        searchOverlay.classList.add('search-overlay--visible');
      }
    }
    if (searchAutocomplete && searchTerm) {
      searchAutocomplete.classList.add('autocomplete__dropdown--visible');
    }
    searchInput.focus();
  };

  // Handle click for icon in the search input
  const setFocusOnMagnifier = (prefix) => {
    const search = document.querySelector(`.${prefix}__search`);
    if (search) {
      const icon = search.querySelector(`.${prefix}__search-icon`);
      icon.addEventListener('click', () => {
        searchInput.focus();
      });
    }
  };

  // Hide autocomplete when user clicks outside the search area
  const onClickOutsideSearch = () => {
    body.addEventListener('click', function (e) {
      const parent = window.helper.findAncestor(e.target, '[data-search-container]');
      const parentTrigger = e.target.matches('[data-search-trigger]');

      if (!parent && !parentTrigger && !e.target.matches('[role*="tab"]') && !e.target.matches('[data-platform]')) {
        onAutocompleteClosed();

        if (searchTrigger && searchOverlay) {
          disableSearchTrigger();
        }
      }
    });
  };

  // Obtain data for event tracking and send them to Algolia
  const trackAlogiaEvent = (e) => {
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

  // Autocomplete render function
  const renderAutocomplete = (renderOptions, isFirstRender) => {
    const { indices, currentRefinement, refine, widgetParams } = renderOptions;
    searchIndice = indices.length ? indices[0] : null;

    // On first render create DOM elements and add listeners to events
    if (isFirstRender) {
      searchAutocomplete = document.createElement('div');
      searchAutocomplete.classList.add('autocomplete__dropdown');

      searchAutocompleteHeader = document.createElement('div');
      searchAutocompleteHeader.classList.add('autocomplete__header');
      searchAutocomplete.appendChild(searchAutocompleteHeader);

      searchAutocompleteList = document.createElement('ul');
      searchAutocomplete.appendChild(searchAutocompleteList);

      searchInput.addEventListener('input', (e) => {
        refine(e.currentTarget.value);
        helper.updateParameter('search', e.currentTarget.value);
      });

      widgetParams.container.appendChild(searchAutocomplete);
      searchInput.addEventListener('focus', () => {
        onAutocompleteOpened(currentRefinement)
      });

      body.addEventListener('click', function (e) {
        trackAlogiaEvent(e);
      });
    }

    // Get data and DOM elements
    searchResultsNumber = searchIndice ? searchIndice.hits.length : 0;
    searchAutocompleteHeader = widgetParams.container.querySelector('.autocomplete__header');
    searchAutocomplete = widgetParams.container.querySelector('.autocomplete__dropdown');
    searchAutocompleteList = widgetParams.container.querySelector('ul');

    // Render autocomplete based on search term existence and number of hits
    if (searchResultsNumber && currentRefinement) {
      searchAutocompleteHeader.innerHTML = formatHeader(currentRefinement);
      searchQueryID = searchIndice ? searchIndice.results.queryID : null;
      searchAutocompleteList.innerHTML = indices
        .map(renderIndexListItem)
        .join('');
      searchAutocomplete.classList.add('autocomplete__dropdown--visible');
    } else if (!searchResultsNumber && currentRefinement) {
      searchAutocompleteHeader.innerHTML = formatHeader(currentRefinement);
      searchAutocompleteList.innerHTML = formatEmptySuggestion();
      searchAutocomplete.classList.add('autocomplete__dropdown--visible');
    } else {
      searchAutocomplete.classList.remove('autocomplete__dropdown--visible');
      searchAutocompleteHeader.innerHTML = '';
      searchAutocompleteList.innerHTML = '';
    }
  };

  const navigateBetweenSuggestions = () => {
    body.addEventListener('keydown', function(e) {
      if (e.target.matches('#nav-search')) {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          if (!searchAutocomplete) return;
          const firstResult = searchAutocomplete.querySelector('.suggestion');
          if (!firstResult) return;
          firstResult.focus();
          if (e.key === 'Enter') firstResult.click();
        }
      }
      if (e.target.matches('.suggestion')) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          if (!searchAutocomplete) return;
          const results = searchAutocomplete.querySelectorAll('.suggestion');
          const resultsNodes = Array.prototype.slice.call(results);
          const currentIndex = resultsNodes.indexOf(e.target);
          let newIndex = currentIndex;
          if (e.key === 'ArrowUp') newIndex--;
          if (e.key === 'ArrowDown') newIndex++;

          if (newIndex >= 0 && newIndex < resultsNodes.length) {
            results[newIndex].focus();
          } else if (newIndex <= -1) {
            searchInput.focus();
          }
        }
      }
    });
  };

  const initErrorSearch = () => {
    const container = document.querySelector('[data-error-search]');
    const title = document.querySelector('[data-error-search-title]');
    if (!container) return;

    const searchTerm = window.location.pathname.split('/').pop().replace(/-/g, ' ');
    searchClient.search([{
      indexName: searchAPI.indexname,
      params: { 
        query: searchTerm 
      }
    }]).then(({ results }) => {
      const hits = results && results[0] ? results[0].hits : null;
      if (!hits) return;
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

  // Create Algolia custom widget based on Autocomplete
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
    if (searchAPI && searchInput) {
      onClickOutsideSearch();
      search.start();
      setFocusOnMagnifier('navigation');
      setFocusOnMagnifier('hero');
      triggerSearchPanel();
      prefillOnLoad();
      navigateBetweenSuggestions();
      initErrorSearch();
    }
  }
})();
