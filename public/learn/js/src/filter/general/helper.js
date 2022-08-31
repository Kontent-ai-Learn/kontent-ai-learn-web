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

  const handleDropDownLabel = (filterGroup, calendar) => {
    const group = document.querySelector(`[data-filter-group="${filterGroup}"]`);
    if (!group) return;
    const label = group.querySelector('.dropdown__label');
    if (!label) return;
    let items;
    if (calendar) {
      items = calendar.selectedDates;
    } else {
      items = group.querySelectorAll(`.filter__item--active`);
    }
    if (!items.length) {
      const originalLabel = label.getAttribute('data-dropdown-label');
      if (!originalLabel) return;
      label.innerHTML = originalLabel;
      return;
    } else if (items.length === 1) {
      if (calendar) {
        const date = new Date(items[0]);
        if (date.getTime() > ((new Date()).getTime())) {
          text = 'Future';
        } else {
          const month = monthsShort[date.getMonth()];
          const year = date.getFullYear();
          text = `${month} ${year}`;
        }
      } else {
        text = `${items[0].innerHTML}`;
      }
    } else {
      text = `${items.length} ${calendar ? window.UIMessages.selectedReleasedMonths : window.UIMessages.selectedAffectedServices}`;
    }
    label.innerHTML = `<div class="dropdown__tag"><div class="dropdown__tag-label">${text}</div><button type="reset" class="dropdown__tag-reset">×</button></div>`;
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
      if (!e.target.matches('.dropdown *') && !e.target.matches('.air-datepicker-cell')) {
        hideDropDowns();
      }
    });
  };

  const createDropDownInteractions = (dropdown, mixer, calendar) => {
    if (!dropdown) return;
    const label = dropdown.querySelector('.dropdown__label');
    const list = dropdown.querySelector('.dropdown__list');
    const type = dropdown.getAttribute('data-filter-group')
    
    if (!(label && list)) return;
    
    label.addEventListener('click', (e) => {
      if (e.target.matches('[type="reset"]') && mixer) {
        if (type === 'calendar' && calendar) calendar.clear();
        mixer.setFilterGroupSelectors(type, []);
        mixer.parseFilterGroups();
        label.innerHTML = label.getAttribute('data-dropdown-label');
        return;
      };
      const isActive = dropdown.classList.contains('dropdown--active');
      if (isActive) {
        dropdown.classList.remove('dropdown--active');
      } else {
        hideDropDowns();
        dropdown.classList.add('dropdown--active');
      }
    });

    list.addEventListener('click', (e) => {
      if (e.target.matches('.dropdown__item')) {
        dropdown.classList.remove('dropdown--active');
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
    hideDropDownsOnClick: hideDropDownsOnClick,
    handleDropDownLabel: handleDropDownLabel
  }
})();
