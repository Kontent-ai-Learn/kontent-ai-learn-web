const landingPage = (() => {
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
    const data = await requestInfo(token);
    console.log(data);
  };
  
  return {
    getInfo: getInfo
  }
})();
