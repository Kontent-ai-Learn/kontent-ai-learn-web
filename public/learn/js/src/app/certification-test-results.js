const certificationTestResults = (() => {
  const isPreview = document.querySelector('body').classList.contains('preview-key');

  const getLinkedInLink = (certificate) => {
    if (!certificate) return '';
    const certIssue = certificate.issued.split('/').map(x => parseInt(x));
    const certExpiration = certificate.expiration ? certificate.expiration.split('/').map(x => parseInt(x)) : null;
    const certName = encodeURIComponent(`${window.UIMessages.productName} ${certificate.name}`);

    return `<a href=${`https://www.linkedin.com/profile/add?startTask=${certName}&name=${certName}&organizationId=17932237&issueYear=${certIssue[0]}&issueMonth=${certIssue[1]}&${certExpiration ? `expirationYear=${certExpiration[0]}&expirationMonth=${certExpiration[1]}` : ''}&certUrl=${!certificate.url.startsWith('http') ? `${window.location.protocol}//${window.location.host}` : ''}${certificate.url}`} target='_blank' ${isPreview ? window.resolveSmartLink.elementCodename('training___add_to_linkedin') : ''}>${UIMessages.addToLinkedIn}</a>`;
  };

  const renderData = (data) => {
    const container = document.querySelector('#trainingAction');
    if (!container || !data) return;
    const originalInnerHTML = container.innerHTML;
    const markup = `
      <div class="article__row-links">
        ${data.renderAs === 'button' && data.id ? `<span class="call-to-action" ${data.id ? `id="${data.id}"` : ''} ${isPreview ? window.resolveSmartLink.elementCodename(data.textUIMessageCodename) : ''}><span>${data.text}</span><span></span></span>` : ''}
        ${data.renderAs === 'button' && data.url ? `<a class="call-to-action" href="${data.url}" ${data.attr ? data.attr : ''} ${data.target ? `target=${data.target}` : ''} ${isPreview ? window.resolveSmartLink.elementCodename(data.textUIMessageCodename) : ''}><span>${data.text}</span><span></span></a>` : ''}
        ${data.renderAs === 'plaintext' && (data.id || data.url) ? data.text : ''}
        ${data.certificate ? `<a class="link" href="${data.certificate.url}" target="_blank" ${isPreview ? window.resolveSmartLink.elementCodename('training___download_certificate') : ''}>${UIMessages.downloadCertificate}</a>${getLinkedInLink(data.certificate)}` : ''}
      </div>
    `;
    container.innerHTML = `${originalInnerHTML}${markup}`;
  };

  const requestInfo = async (codename, contentType, attemptId, token) => {
    let accessType = 'public';
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
        codename: codename,
        attemptid: attemptId
      })
    };

    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
      accessType = 'private';
    }

    const result = await fetch(`/learn/api/${contentType}/detail/${accessType}${encodeURI(window.location.search)}`, fetchOptions);
    const data = await result.json();

    for (const item in data) {
      if (Object.prototype.hasOwnProperty.call(data, item)) {
        renderData(data[item]);
      }
    }
  };

  const getInfo = async () => {
    if (!window.trainingCertificationTestCodename || !window.attemptId) return;
    const codename = window.trainingCertificationTestCodename;
    const type = 'training-certification';
    const attemptId = window.attemptId;

    window.user = await auth0.ensureUserSignedIn();
    const token = window.user ? window.user.__raw : null;
    await requestInfo(codename, type, attemptId, token);
  };

  return {
    getInfo: getInfo
  }
})();