const landingPage = (() => {
  const addSignInButton = () => {
    const container = document.querySelector('.landing-page__auth');
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

  const requestInfo = async (token) => {
    let accessType = 'public';
    const fetchOptions = {
      method: 'POST'
    };

    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
      accessType = 'private';
    } else {
      addSignInButton();
    }

    const result = await fetch(`/learn/api/landing-page/${accessType}`, fetchOptions);
    return await result.json();
  };

  const getInfo = async () => {
    const container = document.querySelector('[data-lp]');
    if (!container) return;

    const user = await auth0.ensureUserSignedIn();
    const token = user ? user.__raw : null;
    const data = await requestInfo(token);
    console.log(data);
  };
  
  return {
    getInfo: getInfo
  }
})();
