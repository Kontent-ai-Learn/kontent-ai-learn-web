const landingPage = (() => {
  const requestInfo = async (token) => {
    let accessType = 'public';
    const fetchOptions = {
      method: 'POST'
    };

    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
      accessType = 'private';
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

