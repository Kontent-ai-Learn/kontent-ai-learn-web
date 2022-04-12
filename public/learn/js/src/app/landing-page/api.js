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

  const addSignInButton = () => {
    const container = document.querySelector('[data-lp-auth]');
    if (!container) return;

    const button = document.createElement('a');
    button.classList.add('button');
    button.setAttribute('href', '#');
    button.setAttribute('id', 'login');
    const label = document.createElement('span');
    label.innerHTML = window.UIMessages.signIn;
    const span = document.createElement('span');
    button.appendChild(label);
    button.appendChild(span);
    container.appendChild(button);
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

    imagePromoted.setAttribute('src', image.getAttribute('src'));
    titlePromoted.innerHTML = title.innerHTML;
    descriptionPromoted.innerHTML = description.innerHTML;
    linkPromoted.setAttribute('href', link.getAttribute('href'));
    linkPromoted.setAttribute('data-lp-lightbox-invoke', item.id);
  };

  const renderLigthboxActions = (id, isFree) => {
    if (!id) {
      const activeLightbox = document.querySelector('[data-lp-active-lightbox]');
      if (activeLightbox) id = activeLightbox.getAttribute('data-lp-active-lightbox');
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

    return `<div class="card__actions">
              ${!window.user ? `<span onclick="auth0.login()" class="button"><span>${window.UIMessages.signIn}</span><span></span></span>` : ''}
              ${!window.user && isFree ? `<span onclick="auth0.signup()" class="button"><span>${window.UIMessages.signUp}</span><span></span></span>` : ''}
              ${window.user && courseItem ? `<span onclick="landingPage.registration('${courseItem.id}')" class="button"><span>${courseItem.label}</span><span></span></span>` : ''}
              ${window.user && examItem && examItem.url ? `<a href="${examItem.url}" class="button"><span>${examItem.label}</span><span></span></a>` : ''}
              ${window.user && examItem && examItem.message ? `<strong class="card__message">${examItem.message}</strong>` : ''}
              ${window.userElearningData && window.userElearningData.code === 3 && !isFree ? `<span class="call-to-action" onclick="window.Intercom && window.Intercom('show')"><span>${window.userElearningData.message}</span><span></span></span>` : ''}
              ${window.userElearningData && (window.userElearningData.code === 1 || window.userElearningData.code === 2) ? window.userElearningData.message : ''}
              </div>
            <div class="card__certificate">
              ${certificate ? `<a class="card__certificate-link" href="${certificate.url}" target="_blank"><span>${window.UIMessages.downloadCertificate}</span><span></span></a>` : ''}
              ${certificate ? `<a class="card__a" href=${`https://www.linkedin.com/profile/add?startTask=${certificate.name}&name=${certificate.name}&organizationId=373060&issueYear=${certificate.issued[0]}&issueMonth=${certificate.issued[1]}&${certificate.expiration ? `expirationYear=${certificate.expiration[0]}&expirationMonth=${certificate.expiration[1]}` : ''}&certUrl=${!certificate.url.startsWith('http') ? `${window.location.protocol}//${window.location.host}` : ''}${certificate.url}`} target='_blank'>${window.UIMessages.addToLinkedIn}</a>` : ''}
            </div>`;
  };

  const addLightboxActions = () => {
    const activeLightboxActions = document.querySelector('[data-lp-active-lightbox-actions]');
    if (activeLightboxActions) activeLightboxActions.innerHTML = renderLigthboxActions();
  };

  const requestInfo = async (token) => {
    const fetchOptions = {
      method: 'POST'
    };

    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
      const result = await fetch(`/learn/api/landing-page`, fetchOptions);
      return await result.json();
    }
    addSignInButton();

    return null
  };

  const getInfo = async () => {
    const container = document.querySelector('[data-lp]');
    if (!container) return;

    window.user = await auth0.ensureUserSignedIn();
    const token = user ? user.__raw : null;
    window.userElearningData = await requestInfo(token);
    console.log(window.userElearningData);
    if (window.userElearningData) {
      addLightboxActions();
      addCetificateLinks(window.userElearningData);
      addPromoted(window.userElearningData.courses.find(item => item.promoted));

      const event = new Event('userElearningDataEvent');
      document.querySelector('body').dispatchEvent(event);
    }
  };

  const registration = async (id) => {
    if (!window.user) window.user = await auth0.ensureUserSignedIn();
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
      const result = await fetch(`/learn/api/landing-page/registration`, fetchOptions);
      data = await result.json();
    }

    if (!data) return;

    if (data && data.url) {
      window.location.href = data.url;
    }
  };
  
  return {
    getInfo: getInfo,
    registration: registration,
    renderLigthboxActions: renderLigthboxActions
  }
})();
