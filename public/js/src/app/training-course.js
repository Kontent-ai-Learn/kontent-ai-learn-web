const trainingCourse = (() => {
  const isPreview = document.querySelector('body').classList.contains('preview-key');

  const renderData = (data) => {
    const container = document.querySelector('#trainingaction');
    if (!container) return;
    const prefix = isPreview ? '(Preview) ' : '';
    const markup = `
      ${data.renderAs === 'button' ? `<span class="call-to-action" ${data.id ? `id="${data.id}"` : ''} ${isPreview ? window.resolveSmartLink.elementCodename(data.textUIMessageCodename) : ''}><span>${prefix}${data.text}</span><span></span></span>` : `<span>${prefix}${data.text}</span>`}
      ${data.signup ? `<span class="call-to-action" id="signup" ${isPreview ? window.resolveSmartLink.elementCodename('sign_out_button') : ''}><span>${UIMessages.signUp}</span><span></span></span>` : ''}
    `;
    container.innerHTML = markup;
    auth0.eventListeners();
  };

  const requestInfo = async (trainingCodename, token) => {
    let access = 'public';
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
        codename: trainingCodename
      })
    };

    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
      access = 'private'
    }

    const result = await fetch(`/api/training-course/detail/${access}`, fetchOptions);
    const data = await result.json();
    renderData(data);
  };

  const getInfo = async () => {
    if (!window.trainingCourseCodename) return;
    let claims = null;
    try {
      await auth0.client.getTokenSilently();
      claims = await auth0.client.getIdTokenClaims();
    } 
    catch (e) { }
    finally {
      const token = claims ? claims.__raw : null;
      await requestInfo(window.trainingCourseCodename, token);
    }
  };

  return {
    getInfo: getInfo
  }
})();