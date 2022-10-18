const landingPage = (() => {
  const addCetificateLinks = (elearningData) => {
    if (!elearningData) return;
    const containers = document.querySelectorAll('[data-lp-item]');

    const data = [...elearningData.courses, ...elearningData.exams];

    for (let i = 0; i < containers.length; i++) {
      const itemId = containers[i].getAttribute('data-lp-item');
      for (let j = 0; j < data.length; j++) {
        
        if (itemId === data[j].id && data[j].certificate) {
          
          const container = containers[i].querySelector('[data-lp-certificate]');
          if (!container) continue;

          const link = document.createElement('A');
          link.classList.add('card__certificate-link');
          link.setAttribute('href', data[j].certificate.url);
          link.setAttribute('target', '_blank');
          link.innerHTML = `<span>${window.UIMessages.downloadCertificate}</span><span></span>`;
          container.appendChild(link);
        }
      }
    }
  };

  const addButton = (type, container) => {
    const label = document.createElement('span');
    const button = document.createElement('a');
    button.classList.add('button');
    const url = window.appUrl || 'https://app.kontent.ai';
    if (type === 'signup') {
      button.setAttribute('href', `${url}/sign-up`);
      button.setAttribute('target', '_blank');
      label.innerHTML = window.UIMessages.signUp;
      button.classList.add('button--secondary');
    }

    if (type === 'login') {
      button.setAttribute('href', `${url}/sign-in`);
      button.setAttribute('target', '_blank');
      label.innerHTML = window.UIMessages.signIn;
    }
    
    const span = document.createElement('span');
    button.appendChild(label);
    button.appendChild(span);
    container.appendChild(button);
  } ;

  const addAuthButton = () => {
    const container = document.querySelector('[data-lp-auth]');
    if (!container) return;

    addButton('login', container);
    addButton('signup', container);
  };

  const addPromoted = (item) => {
    if (!item) return;

    const elem = document.querySelector(`[data-lp-item="${item.id}"]`);
    if (!elem) return;
    const image = elem.querySelector(`[data-lp-lightbox-data="image"]`);
    const title = elem.querySelector(`[data-lp-lightbox-data="title"]`);
    const description = elem.querySelector(`[data-lp-lightbox-data="description"]`);
    const link = elem.querySelector(`[data-lp-link]`);

    const elemPromoted = document.querySelector(`[data-lp-promoted]`);
    if (!elemPromoted) return;
    const imagePromoted = elemPromoted.querySelector(`[data-lp-lightbox-data="image"]`);
    const titlePromoted = elemPromoted.querySelector(`[data-lp-lightbox-data="title"]`);
    const descriptionPromoted = elemPromoted.querySelector(`[data-lp-lightbox-data="description"]`);
    const linkPromoted = elemPromoted.querySelector(`[data-lp-link]`);

    if (image) {
      imagePromoted.setAttribute('src', image.getAttribute('src'));
    } else {
      imagePromoted.remove();
    }
    
    titlePromoted.innerHTML = title.innerHTML;
    descriptionPromoted.innerHTML = description.innerHTML;
    linkPromoted.setAttribute('href', link.getAttribute('href'));
    linkPromoted.setAttribute('data-lp-lightbox-invoke', item.id);
  };

  const removeLoadingFromPromoted = () => {
    const elemPromoted = document.querySelector(`[data-lp-promoted="loading"]`);
    if (!elemPromoted) return;
    elemPromoted.setAttribute('data-lp-promoted', '');
  };

  const removeLoadingFromLightboxActions = () => {
    const elemActions = document.querySelector(`[data-lp-active-lightbox-actions="loading"]`);
    if (!elemActions) return;
    elemActions.setAttribute('data-lp-active-lightbox-actions', '');
  };

  const renderLigthboxActions = (id, isFree) => {
    const activeLightbox = document.querySelector('[data-lp-active-lightbox]');
    if (!id) {
      if (activeLightbox) id = activeLightbox.getAttribute('data-lp-active-lightbox');
    }
    if (!isFree) {
      if (activeLightbox) isFree = !!activeLightbox.querySelector('[data-lp-lightbox-data="free"]');
    }
    const courseData = window.userElearningData || {};
    const courseItem = courseData.courses ? courseData.courses.find(item => id === item.id) : null;
    const examItem = courseData.exams ? courseData.exams.find(item => id === item.id) : null;
    let certificate;
    if ((courseItem && courseItem.certificate) || (examItem && examItem.certificate)) {
      const item = courseItem || examItem;
      certificate = {
        issued: item.certificate.issued.split('/').map(x => parseInt(x)),
        expiration: item.certificate.expiration ? item.certificate.expiration.split('/').map(x => parseInt(x)) : null,
        name:  encodeURIComponent(`${window.UIMessages.productName} ${item.certificate.name}`),
        url: item.certificate.url
      }
    }

    if (typeof isFree === 'undefined' && courseItem) {
      isFree = courseItem.isFree;
    }

    return `
      ${window.userProfile && (courseItem || examItem) ? `<div class="card__toc"><label class="toc" for="toc"><input id="toc" type="checkbox" class="toc__checkbox" data-lp-toc${window.userProfile.toc ? ' checked="checked"' : ''}><div class="toc__label">${window.helper.decodeHTMLEntities(window.UIMessages.toc)}</div></label></div>`: ''}
      <div class="card__actions-container">
        <div class="card__actions">
          ${!window.user ? `<span onclick="auth0.login()" class="button"><span>${window.UIMessages.signIn}</span><span></span></span>` : ''}
          ${!window.user && isFree ? `<a href="${window.appUrl || 'https://app.kontent.ai'}/sign-up" class="button" target="_blank"><span>${window.UIMessages.signUp}</span><span></span></a>` : ''}
          ${window.user && courseItem && window.userProfile ? `<div data-lp-disabled="${!window.userProfile.toc}" lp-disabled-tooltip="${window.UIMessages.agreeFairPolicy}" lp-disabled-tooltip-active="false"><span onclick="landingPage.registration('${courseItem.id}')" class="button"><span>${courseItem.label}</span><span></span></span></div>` : ''}
          ${window.user && examItem && examItem.url && window.userProfile ? `<div data-lp-disabled="${!window.userProfile.toc}" lp-disabled-tooltip="${window.UIMessages.agreeFairPolicy}" lp-disabled-tooltip-active="false"><a href="${examItem.url}" class="button"><span>${examItem.label}</span><span></span></a></div>` : ''}
          ${window.user && examItem && examItem.message ? `<strong class="card__message">${examItem.message}</strong>` : ''}
          ${window.userElearningData && (window.userElearningData.code === 1 || window.userElearningData.code === 2 || (window.userElearningData.code === 3 && !isFree)) ? window.userElearningData.message : ''}
        </div>
        ${window.userProfile && (courseItem || examItem) ? `
          <div class="card__certificate" data-lp-disabled="${window.userProfile ? !window.userProfile.toc : 'false'}" lp-disabled-tooltip="${window.UIMessages.agreeFairPolicy}" lp-disabled-tooltip-active="false">
            ${certificate ? `<a class="card__certificate-link" href="${certificate.url}" target="_blank"><span>${window.UIMessages.downloadCertificate}</span><span></span></a>` : ''}
            ${certificate ? `<a class="card__a" href=${`https://www.linkedin.com/profile/add?startTask=${certificate.name}&name=${certificate.name}&organizationId=17932237&issueYear=${certificate.issued[0]}&issueMonth=${certificate.issued[1]}&${certificate.expiration ? `expirationYear=${certificate.expiration[0]}&expirationMonth=${certificate.expiration[1]}` : ''}&certUrl=${!certificate.url.startsWith('http') ? `${window.location.protocol}//${window.location.host}` : ''}${certificate.url}`} target='_blank'>${window.UIMessages.addToLinkedIn}</a>` : ''}
          </div>
        ` : ''}
      </div>`;
  };

  const handleToc = (profile, email, token) => {
    if (profile.toc) {
      const tocElems = document.querySelectorAll('[data-lp-toc]');
      for (let i = 0; i < tocElems.length; i++) {
        tocElems[i].checked = true;
      }
    }

    document.querySelector('body').addEventListener('click', async (e) => {
      const item = e.target.closest('[data-lp-disabled="true"][lp-disabled-tooltip][lp-disabled-tooltip-active="false"]');
      if (!item) return;
      item.setAttribute('lp-disabled-tooltip-active', 'true');
    });

    document.querySelector('body').addEventListener('click', async (e) => {
      const item = e.target.closest('[data-lp-toc]');
      if (item) {
        if (!!item.checked) {
          const tooltips = document.querySelectorAll('[data-lp-disabled="true"][lp-disabled-tooltip][lp-disabled-tooltip-active="true"]');
          for (let i = 0; i < tooltips.length; i++) {
            tooltips[i].setAttribute('lp-disabled-tooltip-active', 'false');
          }
        }

        const disabled = document.querySelectorAll('[data-lp-disabled]');
        for (let i = 0; i < disabled.length; i++) {
          disabled[i].setAttribute('data-lp-disabled', !item.checked);
        }

        window.userProfile = await updateUserProfile(token, {
          toc: !!item.checked
        });
      }

      const disabled = e.target.closest('[data-lp-disabled="true"]');
      if (disabled) {
        e.preventDefault();
      }
    });
  };

  const addLightboxActions = () => {
    const activeLightboxActions = document.querySelector('[data-lp-active-lightbox-actions]');
    if (activeLightboxActions) {
      activeLightboxActions.innerHTML = renderLigthboxActions();
      window.helper.startTimerDate();
    }
  };

  const requestInfo = async (token) => {
    const fetchOptions = {
      method: 'POST'
    };

    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
      try {
        const result = await fetch(`/learn/api/landing-page/`, fetchOptions);
        return await result.json();
      } catch (error) {
        console.error(error);
      }
    }
    addAuthButton();

    return null;
  };

  const requestUserProfile = async (token) => {
    if (!token) return null;

    const fetchOptions =  { 
      method: 'GET',
      headers : { 
        Authorization: `Bearer ${token}` 
      }
    };
    
    try {
      const result = await fetch(`/learn/api/user/profile/`, fetchOptions);
      return await result.json();
    } catch (error) {
      console.error(error);
    }
  };

  const updateUserProfile = async (token, body) => {
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify(body)
    };

    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
      try {
        const result = await fetch(`/learn/api/user/profile/`, fetchOptions);
        return await result.json();
      } catch (error) {
        console.error(error);
      }
    }

    return null;
  };

  const getInfo = async () => {
    const container = document.querySelector('[data-lp]');
    if (!container) return;

    const token = window.user ? window.user.__raw : null;
    window.userElearningData = await requestInfo(token);
    if (window.userElearningData) {
      addCetificateLinks(window.userElearningData);
      addPromoted(window.userElearningData.courses.find(item => item.promoted));
    }
    removeLoadingFromPromoted();
    const event = new Event('userElearningDataEvent');
    document.querySelector('body').dispatchEvent(event);
    window.userProfile = await requestUserProfile(token);
    addLightboxActions();
    removeLoadingFromLightboxActions();
    if (window.userProfile) {
      handleToc(window.userProfile, user.email, token);
    }
    if (handleDefaultAnchorScrollOnPageLoad) {
      handleDefaultAnchorScrollOnPageLoad();
    }
  };

  const registration = async (id) => {
    if (!window.user) return;
    if (!window.userProfile.toc) return;
    const token = window.user ? window.user.__raw : null;
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
        id: id
      })
    };

    let data = null;
    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
      const result = await fetch(`/learn/api/landing-page/registration/`, fetchOptions);
      data = await result.json();
    }

    if (!data) return;

    if (data && data.url) {
      window.location.href = data.url;
    }
  };
  
  return {
    getInfo,
    registration,
    renderLigthboxActions,
    requestUserProfile,
    handleToc,
  }
})();
