const trainingCourse = (() => {
  const isPreview = document.querySelector('body').classList.contains('preview-key');

  const getLinkedInLink = (certificate) => {
    if (!certificate) return '';
    const certIssue = certificate.issued_date.split('/').map(x => parseInt(x));
    const certExpiration = certificate.expiration_date ? certificate.expiration_date.split('/').map(x => parseInt(x)) : null;
    const certName = encodeURIComponent(certificate.course_name);

    return `<a href=${`https://www.linkedin.com/profile/add?startTask=${certName}&name=${certName}&organizationId=373060&issueYear=${certIssue[0]}&issueMonth=${certIssue[1]}&${certExpiration ? `expirationYear=${certExpiration[0]}&expirationMonth=${certExpiration[1]}` : ''}&certUrl=${!certificate.public_url.startsWith('http') ? `${window.location.protocol}//${window.location.host}` : ''}${certificate.public_url}`} target='_blank' ${isPreview ? window.resolveSmartLink.elementCodename('training___add_to_linkedin') : ''}>${UIMessages.addToLikedIn}</a>`;
  };

  const renderCourseInfo = (data) => {
    const container = document.querySelector('#trainingAction');
    if (!container || !data) return;
    const originalInnerHTML = container.innerHTML;
    const logoutBtnExists = document.querySelector('#logout') != null;
    const markup = `
      <div class="article__row-links">
        ${data.renderAs === 'text' ? `<div  class="article__row"><div class="callout callout--info"><div><p>${data.text}</p></div></div></div>` : ''}
        ${data.renderAs === 'button' && (data.id || data.action) ? `<span class="call-to-action" ${data.id ? `id="${data.id}"` : ''} ${data.action === 'intercom' ? `data-click="support-async"` : ''} ${isPreview ? window.resolveSmartLink.elementCodename(data.textUIMessageCodename) : ''}><span>${data.text}</span><span></span></span>` : ''}
        ${data.renderAs === 'button' && data.url ? `<a class="call-to-action" href="${data.url}" ${data.attr ? data.attr : ''} ${data.target ? `target=${data.target}` : ''} ${isPreview ? window.resolveSmartLink.elementCodename(data.textUIMessageCodename) : ''}><span>${data.text}</span><span></span></a>` : ''}
        ${data.renderAs === 'button' && data.qs ? `<a class="call-to-action" href="${window.location.href.split('#')[0].split('?')[0]}?${data.qs}" ${data.target ? `target=${data.target}` : ''} ${isPreview ? window.resolveSmartLink.elementCodename(data.textUIMessageCodename) : ''}><span>${data.text}</span><span></span></a>` : ''}
        ${data.signup && !data.urlSignUp ? `<span class="call-to-action" id="signup" ${isPreview ? window.resolveSmartLink.elementCodename('sign_up_button') : ''}><span>${UIMessages.signUp}</span><span></span></span>` : ''}
        ${data.signup && data.urlSignUp ? `<a class="call-to-action" href="${data.urlSignUp}/sign-up" target="_blank" ${isPreview ? window.resolveSmartLink.elementCodename('sign_up_button') : ''}><span>${UIMessages.signUp}</span><span></span></a>` : ''}
        ${data.certificate ? `<a class="link" href="${data.certificate.public_url}" target="_blank" ${isPreview ? window.resolveSmartLink.elementCodename('training___download_certificate') : ''}>${UIMessages.downloadCertificate}</a>${getLinkedInLink(data.certificate)}` : ''}
        ${data.signedIn && !logoutBtnExists ? `<span class="link" id="logout" ${isPreview ? window.resolveSmartLink.elementCodename('sign_out_button') : ''}>${UIMessages.signOut}</span>` : ''}
      </div>
    `;
    container.innerHTML = `${originalInnerHTML}${markup}`;
  };

  const renderCourseNotes = (data) => {
    const container = document.querySelector('#trainingNotes');
    if (!container || !data) return;

    const completionInt = parseInt(data.completion);
    if ((isNaN(completionInt) || completionInt <= 100) && typeof data.completion !== 'undefined') {
      const elem = document.createElement('span');
      elem.innerHTML = `${data.completion}${isNaN(completionInt) ? '' : '% complete'}`;
      container.appendChild(elem);
    }
  };

  const renderData = (data) => {
    if (!data) return;
    if (data.redirectToLMS && data.url) {
      window.location.replace(data.url);
    }
    renderCourseInfo(data);
    renderCourseNotes(data);
    auth0.eventListeners();
  };

  const requestInfo = async (codename, contentType, token) => {
    let accessType = 'public';
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
        codename: codename
      })
    };

    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
      accessType = 'private';
    }

    const result = await fetch(`/learn/api/${contentType}/detail/${accessType}${encodeURI(window.location.search)}`, fetchOptions);
    const data = await result.json();

    for (var item in data) {
      if (Object.prototype.hasOwnProperty.call(data, item)) {
        renderData(data[item]);
      }
    }
  };
  const performUIActions = () => {
    window.helper.startTimer('[data-timer]');
    window.helper.removeHrefOnClick();
  };

  const getInfo = async () => {
    if (!(window.trainingCourseCodename || window.trainingCertificationTestCodename)) return;
    let type = 'training-course';
    let codename = window.trainingCourseCodename;
    if (window.trainingCertificationTestCodename) {
      codename = window.trainingCertificationTestCodename;
      type = 'training-certification';
    }

    let user = null;
    try {
      user = await auth0.ensureUserSignedIn();
    } 
    catch (e) { }
    finally {
      const token = user ? user.__raw : null;
      await requestInfo(codename, type,  token);
      performUIActions();
    }
  };

  return {
    getInfo: getInfo
  };
})();