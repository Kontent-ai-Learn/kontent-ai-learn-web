window.helperFilter = (() => {
  var getUrl = function (loc) {
    if (!loc) loc = window.location;
    return loc.protocol + '//' + loc.hostname + (loc.port ? ':' + loc.port : '') + loc.pathname;
  };

  var setFilterOnLoad = function (itemsToShow, filterGroup) {
    if (itemsToShow) {
      itemsToShow = itemsToShow.split(',');
      var items = document.querySelectorAll(`[data-filter-group="${filterGroup}"] .filter__item`);
      for (var i = 0; i < items.length; i++) {
        var attr = items[i].getAttribute('data-toggle').replace('.', '');
        for (var j = 0; j < itemsToShow.length; j++) {
          if (attr === itemsToShow[j]) {
            items[i].click();
          }
        }
      }
    }
  };

  var getActiveItems = function (filterGroup) {
    var items = document.querySelectorAll(`[data-filter-group="${filterGroup}"] .filter__item--active`);

    if (!items.length) {
        return '';
    }

    var codenames = [];

    for (var i = 0; i < items.length; i++) {
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
