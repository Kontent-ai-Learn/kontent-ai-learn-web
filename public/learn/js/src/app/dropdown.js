window.dropdownHelper = (() => {
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

  const hideDropDowns = (scope) => {
    if (!scope) {
      scope = document.querySelector('body');
    }
    const dropdowns = scope.querySelectorAll('.dropdown');
    for (let i = 0; i < dropdowns.length; i++) {
      dropdowns[i].classList.remove('dropdown--active');
    }
  };

  const hideDropDownsOnClick = (scope) => {
    const body = document.querySelector('body');

    body.addEventListener('click', (e) => {
      if (!e.target.matches('.dropdown *') && !e.target.matches('.air-datepicker-cell')) {
        hideDropDowns(scope);
      }
    });
  };

  const createDropDownInteractions = (dropdown, mixer, calendar, token) => {
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

    list.addEventListener('click', async (e) => {
      if (e.target.matches('.dropdown__item')) {
        dropdown.classList.remove('dropdown--active');
        label.innerHTML = e.target.innerHTML;

        if (dropdown.classList.contains('dropdown--icons')) {
          label.setAttribute('style', e.target.getAttribute('style'));
        }

        if (e.target.hasAttribute('data-user-profile-platform')) {
          const platform = e.target.getAttribute('data-user-profile-platform');

          if (token) {
            window.userProfile = await landingPage.updateUserProfile(token, {
              platform: platform
            });
          }
        }
      }
    });
  };

  return {
    hideDropDowns: hideDropDowns,
    createDropDownInteractions: createDropDownInteractions,
    hideDropDownsOnClick: hideDropDownsOnClick,
    handleDropDownLabel: handleDropDownLabel
  };
})();