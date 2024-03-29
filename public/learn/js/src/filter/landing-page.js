(() => {
  const getUniquePersonas = () => {
    const tags = document.querySelectorAll('[data-lp-persona]');
    const personas = [];
    for (let i = 0; i < tags.length; i++) {
      const name = tags[i].innerText;
      const codename = tags[i].getAttribute('data-lp-persona');
      let accessLevel = [];
      const accessLevelElem = tags[i].closest('[data-access]');
      if (accessLevelElem) {
        accessLevel = accessLevelElem.getAttribute('data-access').split(' ');
      }

      let isExistingPersona = false;
      for (let j = 0; j < personas.length; j++) {
        if (personas[j].codename === codename) {
          isExistingPersona = true;
          accessLevel.forEach((level) => personas[j].accessLevel.add(level));
        }
      }

      if (!isExistingPersona) {
        personas.push({
          name: name,
          codename: codename,
          accessLevel: new Set(accessLevel)
        });
      }
    }

    personas.forEach((persona) => {
      const accessLevel = Array.from(persona.accessLevel);
      persona.accessLevel = accessLevel.includes('all') ? ['all'] : accessLevel;
    });

    return personas;
  };

  const getUniqueProgresses = () => {
    if (!window.userElearningData) return;
    const progresses = [];
    for (let i = 0; i < window.userElearningData.courses.length; i++) {
      const existingItem = progresses.find(item => item.codename === window.userElearningData.courses[i].progress.codename);
      if (existingItem) continue;
      progresses.push(window.userElearningData.courses[i].progress);
    }
    return progresses;
  };

  const createDropDownMarkup = (data, defaultLabel, name, container) => {
    if (!(data && defaultLabel && name && container)) return;
    const dropdown = document.createElement('div');
    dropdown.classList.add('dropdown');

    const label = document.createElement('div');
    label.classList.add('dropdown__label');
    label.innerHTML = defaultLabel;

    const list = document.createElement('ul');
    list.classList.add('dropdown__list');
    list.setAttribute('data-filter-group', name);

    const reset = {
      codename: 'reset',
      name: defaultLabel
    };
    data.unshift(reset);
    
    for (let i = 0; i < data.length; i++) {
      const item = document.createElement('li');
      item.classList.add('dropdown__item');

      if (data[i].codename === 'reset') {
        item.setAttribute('data-filter', `.f-${data[i].codename}-${name}`);
        item.innerHTML = defaultLabel;
      } else {
        item.setAttribute('data-filter', `.f-${data[i].codename}`);
        item.innerHTML = data[i].name; 
      }

      if (data[i].accessLevel) {
        item.setAttribute('data-access', data[i].accessLevel.join(' '));
      }

      list.appendChild(item);
    }

    dropdown.appendChild(label);
    dropdown.appendChild(list);
    container.appendChild(dropdown);

    window.dropdownHelper.createDropDownInteractions(dropdown);
  };

  const createSearchMarkup = (container) => {
    if (!container) return;
    const search = document.createElement('div');
    search.classList.add('filter-search');
    search.setAttribute('data-filter-group', 'text');

    const icon = document.createElement('div');
    icon.classList.add('filter-search__icon');

    const label = document.createElement('label');
    label.classList.add('sr-only');
    label.setAttribute('for', 'filter-search');
    label.innerHTML = 'Search for e-learning courses';

    const input = document.createElement('input');
    input.setAttribute('id', 'filter-search');
    input.setAttribute('name', 'filter-search');
    input.setAttribute('type', 'text');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('placeholder', label.innerHTML);
    input.setAttribute('data-search-attribute', 'data-lp-filter-text');

    search.appendChild(icon);
    search.appendChild(label);
    search.appendChild(input);
    container.appendChild(search);
  };

  const createFilterAttributes = () => {
    const filterItems = document.querySelectorAll('[data-lp-filter-item]');

    for (let i = 0; i < filterItems.length; i++) {
      const classList = ['mix', 'f-reset-roles'];
      const tags = filterItems[i].querySelectorAll('[data-lp-persona]');
      for (let j = 0; j < tags.length; j++) {
        classList.push(`f-${tags[j].getAttribute('data-lp-persona')}`);
      }
      filterItems[i].classList.add(...classList);

      const title = filterItems[i].querySelector('.card__title');
      if (title) {
        filterItems[i].setAttribute('data-lp-filter-text', title.innerText.toLowerCase());
      }
    }
  };

  const createFilterProgressAttributes = () => {
    if (!window.userElearningData) return;
    const filterItems = document.querySelectorAll('[data-lp-filter-item]');

    for (let i = 0; i < filterItems.length; i++) {
      filterItems[i].classList.add('f-reset-progress');
      const card = filterItems[i].querySelector('[data-lp-item]');
      if (!card) continue;
      const id = card.getAttribute('data-lp-item');
      const elearningItem = window.userElearningData.courses.find(item => item.id === id);
      if (!elearningItem) continue;
      filterItems[i].classList.add(`f-${elearningItem.progress.codename}`);
    }
  };

  const updateGroups = () => {
    const groups = document.querySelectorAll('.landing-page__courses-group');
    for (let i = 0; i < groups.length; i++) {
      const slides = groups[i].querySelectorAll('.splide__slide');
      if (slides.length) {
        groups[i].classList.remove('landing-page__courses-group--hide');
      } else {
        groups[i].classList.add('landing-page__courses-group--hide');
      }
      const disabledArrows = groups[i].querySelectorAll('.splide__arrow[disabled]');
      if (disabledArrows.length !== 2) {
        groups[i].classList.remove('landing-page__courses-group--no-arrows');
      } else {
        groups[i].classList.add('landing-page__courses-group--no-arrows');
      }
    }
  };

  const initFilter = () => {
    const mixerContainer = document.querySelector('[data-lp-filter-container]');
    if (!mixerContainer) return;
    const mixer = window.mixitup(mixerContainer, {
      animation: {
          enable: false
      },
      classNames: {
          modifierActive: ' dropdown__item--active'
      },
      multifilter: {
          enable: true,
          logicBetweenGroups: 'and',
          logicWithinGroup: 'or'
      },
      callbacks: {
        // Do not touch the callbacks - the way they show/hide slides is fragile as Mixitup and Splidejs work together
        onMixStart: function () {
          mixerContainer.setAttribute('data-lp-filter-container', 'mixing');
          const state = mixer.getState();
          for (let j = 0; j < state.hide.length; j++) {
            state.hide[j].classList.add('splide__slide');
          }
        },
        onMixEnd: function () {
          const state = mixer.getState();
          if (window.landingPageSliders && window.landingPageSliders.length) {
            for (let i = 0; i < window.landingPageSliders.length; i++) {
              for (let j = 0; j < state.hide.length; j++) {
                state.hide[j].classList.remove('splide__slide');
              }
              window.landingPageSliders[i].destroy();
              window.landingPageSliders[i].mount();
              for (let j = 0; j < state.hide.length; j++) {
                state.hide[j].style.display = 'none';
              }
            }
          }
          updateGroups();
          mixerContainer.setAttribute('data-lp-filter-container', '');
        }
      }
    });

    return mixer;
  };

  const personas = getUniquePersonas();
  const rolesContainer = document.querySelector('[data-lp-roles]');
  const searchContainer = document.querySelector('[data-lp-search]');

  createDropDownMarkup(personas, 'All roles', 'roles', rolesContainer);
  createSearchMarkup(searchContainer);
  window.dropdownHelper.hideDropDownsOnClick(document.querySelector('[data-lp]'));
  createFilterAttributes();
  updateGroups();
  const mixer = initFilter();

  document.querySelector('body').addEventListener('userElearningDataEvent', function (e) {
    const progresses = getUniqueProgresses();
    const progressContainer = document.querySelector('[data-lp-progress]');
    createDropDownMarkup(progresses, 'All courses', 'progress', progressContainer);
    createFilterProgressAttributes();

    if (mixer) {
      mixer.destroy();
      initFilter();
    }
  }, false);
})();