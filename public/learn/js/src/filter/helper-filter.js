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

  const hideDropDowns = () => {
    const body = document.querySelector('body');
    const dropdowns = body.querySelectorAll('.dropdown');
    for (let i = 0; i < dropdowns.length; i++) {
      dropdowns[i].classList.remove('dropdown--active');
    }
  };

  const hideDropDownsOnClick = () => {
    const body = document.querySelector('body');

    body.addEventListener('click', (e) => {
      if (!e.target.matches('[class*="dropdown"]')) {
        hideDropDowns();
      }
    });
  };

const createDropDownInteractions = (dropdown) => {
    if (!dropdown) return;
    const label = dropdown.querySelector('.dropdown__label');
    const list = dropdown.querySelector('.dropdown__list');
    
    if (!(label && list)) return;
    
    label.addEventListener('click', () => {
      const isActive = dropdown.classList.contains('dropdown--active');
      if (isActive) {
        dropdown.classList.remove('dropdown--active');
      } else {
        hideDropDowns();
        dropdown.classList.add('dropdown--active');
      }
    });

    list.addEventListener('click', (e) => {
        dropdown.classList.remove('dropdown--active');
        if (e.target.matches('.dropdown__item')) {
          label.innerHTML = e.target.innerHTML;
        }
    });
  };

  return {
    getUrl: getUrl,
    setFilterOnLoad: setFilterOnLoad,
    getActiveItems: getActiveItems,
    hideDropDowns: hideDropDowns,
    createDropDownInteractions: createDropDownInteractions,
    hideDropDownsOnClick: hideDropDownsOnClick
  }
})();
