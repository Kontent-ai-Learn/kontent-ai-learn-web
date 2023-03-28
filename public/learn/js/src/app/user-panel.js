window.initUserProfile = (container) => {
  const DATA_ATTR_PREFIX = 'data-user-profile-';
  const DATA_ATTR_PANEL = `${DATA_ATTR_PREFIX}panel`;
  const DATA_ATTR_TOGGLE = `${DATA_ATTR_PREFIX}toggle`;
  const DATA_ATTR_CONTENT = `${DATA_ATTR_PREFIX}content`;
  const DATA_ATTR_TERMS = `${DATA_ATTR_PREFIX}terms`;
  const DATA_ATTR_UX = `${DATA_ATTR_PREFIX}ux`;
  const DATA_ATTR_PLATFORMS = `${DATA_ATTR_PREFIX}platforms`;
  const DATA_ATTR_PLATFORM = `${DATA_ATTR_PREFIX}platform`;
  const DATA_ATTR_PLATFORM_SLUG = `${DATA_ATTR_PREFIX}platform-slug`;
  const DATA_ATTR_PROGRESS = `${DATA_ATTR_PREFIX}progress`;
  const DROPDOWN_NONE_LABEL = 'None';

  const requestElearningProgress = async (token) => {
    if (!token) return null;

    const fetchOptions =  { 
      method: 'GET',
      headers : { 
        Authorization: `Bearer ${token}` 
      }
    };
    
    try {
      const result = await fetch(`/learn/api/e-learning/progress/`, fetchOptions);
      return await result.json();
    } catch (error) {
      console.error(error);
    }
  };

  const registerPanelEvents = (panel, token) => {
    panel.addEventListener('click', async (e) => {
      if (!e.target) return;

      const terms = e.target.closest(`[${DATA_ATTR_TERMS}]`);
      if (terms) {
        window.userProfile = await window.helper.updateUserProfile(token, {
          toc: !!terms.checked
        });
      }

      const ux = e.target.closest(`[${DATA_ATTR_UX}]`);
      if (ux) {
        window.userProfile = await window.helper.updateUserProfile(token, {
          ux: !!ux.checked
        });
      }
    });

    window.dropdownHelper.createDropDownInteractions(panel.querySelector(`[${DATA_ATTR_PLATFORMS}]`), null, null, token);
    window.dropdownHelper.hideDropDownsOnClick(panel);
  };

  const getPanelContent = async (panel) => {
    if (panel.hasAttribute(DATA_ATTR_CONTENT)) return;

    const token = window.user ? window.user.__raw : null;
    window.userProfile = !window.userProfile || window.userProfile.error ? await window.helper.requestUserProfile(token) : window.userProfile;

    if (!(window.userProfile && window.UIMessages)) return;

    let name = '';
    let email = '';
    if (window.userProfile.firstName && window.userProfile.lastName) {
      name = `${window.userProfile.firstName} ${window.userProfile.lastName}`;
      email = window.userProfile.email;
    }
    if (!name.trim() && window.userProfile.email) {
      name = window.userProfile.email;
      email = '';
    }
    let preselectedPlatform;
    if (window.platformsConfig && window.platformsConfig.length) {
      preselectedPlatform = window.platformsConfig.find((item) => item.platform === window.userProfile.platform);
    }

    panel.innerHTML = `
      <div class="user-panel__row user-panel__row--no-spacing">
        <div class="user-panel__column">
          <div class="user-panel__heading user-panel__heading--user">${name}</div>
        </div>
        <div class="user-panel__column">
          <a href="#" id="logout" class="user-panel__link user-panel__link--signout">${window.UIMessages.signOut}</a>
        </div>
      </div>
      <div class="user-panel__row">
        <div class="user-panel__column">
          <span class="user-panel__email">${email}</span>
        </div>
        <div class="user-panel__column">
          <a href="${appUrl || 'https://app.kontent.ai'}/user-profile" target="_blank" class="user-panel__link">${window.UIMessages.edit}</a>
        </div>
      </div>
      <div class="user-panel__row">
        <div class="user-panel__column">
          <label class="toc" for="tocUserPanel"><input id="tocUserPanel" type="checkbox" class="toc__checkbox" ${DATA_ATTR_TERMS}${window.userProfile.toc ? ' checked="checked"' : ''}><div class="toc__label">${window.helper.decodeHTMLEntities(window.UIMessages.toc)}</div></label>
          <label class="toc" for="ux"><input id="ux" type="checkbox" class="toc__checkbox" ${DATA_ATTR_UX}${window.userProfile.ux ? ' checked="checked"' : ''}><div class="toc__label">${window.helper.decodeHTMLEntities(window.UIMessages.contactByUx)}</div></label>
        </div>
      </div>
      ${window.platformsConfig && window.platformsConfig.length ? `
        <div class="user-panel__row">
          <div class="user-panel__column user-panel__column--flex">
            <div class="user-panel__dropdown-label">My preferred technology is</div>
            <div class="dropdown dropdown--icons" ${DATA_ATTR_PLATFORMS}>
              <div class="dropdown__label"${preselectedPlatform ? `style="background-image:url('${preselectedPlatform.icon}')"` : ''}>${preselectedPlatform ? preselectedPlatform.title : DROPDOWN_NONE_LABEL}</div>
              <ul class="dropdown__list">
                ${window.platformsConfig.map((item) => {
                  return `<li class="dropdown__item" style="background-image:url('${item.icon}')" ${DATA_ATTR_PLATFORM}="${item.platform}" ${DATA_ATTR_PLATFORM_SLUG}="${item.url}">${item.title}</li>`
                }).join('')}
              </ul>
            </div>
          </div>
        </div>
      ` : ''}
      <div class="user-panel__row">
        <div class="user-panel__column">
          <div class="user-panel__heading user-panel__heading--e-learning">${window.UIMessages.learningProgress}</div>
          <div class="user-panel__e-learning" ${DATA_ATTR_PROGRESS}>
          
          </div>
        </div>
      </div>
    `;

    registerPanelEvents(panel, token);

    panel.setAttribute(DATA_ATTR_CONTENT, '');

    const elearningProgress = await requestElearningProgress(token);
    const panelElearning = panel.querySelector(`[${DATA_ATTR_PROGRESS}]`);
    if (!panelElearning) return;

    const landingPageItem = window.urlMap && window.urlMap.find((item) => item.type === 'landing_page');

    panelElearning.innerHTML = `
      <ul class="user-panel__progress">
        ${elearningProgress.topics.map((item) => {
          const progress = Math.floor(100 / item.coursesTotal * item.coursesCompleted);
          return `
            <li class="user-panel__progress-item">
              <a href="${landingPageItem ? landingPageItem.url : '/learn/e-learning/'}#a-${window.helper.generateAnchor(item.name)}" class="user-panel__topic-name">${item.name}</a>
              <div class="user-panel__topic-progress-container">
              <div class="user-panel__topic-progress">
                <div class="user-panel__topic-progress-bar" style="width:${progress}%"></div>
              </div>
              <div class="user-panel__topic-progress-num">${progress}%</div>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
      <div class="user-panel__subscription-report"><a class="call-to-action" href="/learn/subscription-report/"><span>${window.UIMessages.seeReportButton}</span><span></span></a></div>
    `;

    panelElearning.setAttribute(DATA_ATTR_CONTENT, '');
  };

  const getPanel = (container) => {
    let panel = container.querySelector(`[${DATA_ATTR_PANEL}]`);
    if (!panel) {
      panel = document.createElement('div');
      panel.classList.add('user-panel');
      panel.setAttribute(DATA_ATTR_PANEL, '');
      container.appendChild(panel);
    }
    return panel;
  };  

  const init = (container) => {
    let panel;

    document.querySelector('body').addEventListener('click', (e) => {
      if (!e.target) return;
      
      if (e.target.closest(`[${DATA_ATTR_TOGGLE}]`)) {
        panel = getPanel(container);
        panel.classList.toggle('user-panel--active');
        getPanelContent(panel);
      } else if (e.target.closest(`[${DATA_ATTR_PANEL}]`)) {
        //do nothing
      } else {
        if (panel) panel.classList.remove('user-panel--active');
      }
    }, false);

  };

  return init(container);
};