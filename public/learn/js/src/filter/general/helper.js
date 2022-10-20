window.helperFilter = (() => {
  const monthsShort =  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

  return {
    getUrl: getUrl,
    setFilterOnLoad: setFilterOnLoad,
    getActiveItems: getActiveItems
  }
})();
