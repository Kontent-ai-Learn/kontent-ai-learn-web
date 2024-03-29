window.helperFilter = (() => {
  const getUrl = (loc) => {
    if (!loc) loc = window.location;
    return loc.protocol + '//' + loc.hostname + (loc.port ? ':' + loc.port : '') + loc.pathname;
  };

  const setFilterOnLoad = (itemsToShow, filterGroup) => {
    if (itemsToShow) {
      itemsToShow = itemsToShow.split(',');
      const items = document.querySelectorAll(`[data-filter-group="${filterGroup}"] .filter__item`);
      for (let i = 0; i < items.length; i++) {
        let attr = items[i].getAttribute('data-toggle').replace('.', '');
        for (let j = 0; j < itemsToShow.length; j++) {
          if (attr === itemsToShow[j]) {
            items[i].click();
          }
        }
      }
    }
  };

  const getActiveItems = (filterGroup) => {
    const items = document.querySelectorAll(`[data-filter-group="${filterGroup}"] .filter__item--active`);

    if (!items.length) {
        return '';
    }

    const codenames = [];

    for (let i = 0; i < items.length; i++) {
        codenames.push(items[i].getAttribute('data-toggle').replace('.', ''));
    }

    return codenames.join(',');
  };

  const arrayGroupBy = function(xs, key) {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  };
  
  return {
    getUrl: getUrl,
    setFilterOnLoad: setFilterOnLoad,
    getActiveItems: getActiveItems,
    arrayGroupBy: arrayGroupBy
  }
})();
