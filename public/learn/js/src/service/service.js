const ensureAuth0Login = async () => {
  const auth0 = {};
  const auth0Settings = {
      domain: window.auth0Config.domain,
      client_id: window.auth0Config.clientID,
      redirect_uri: `${location.protocol}//${location.host}/learn/callback/`,
      scope: 'openid email profile'
  };
  auth0.client = await createAuth0Client(auth0Settings);

  try {
    const user = await auth0.client.getIdTokenClaims();
    if (user.email.endsWith('@kentico.com') || user.email.endsWith('@milanlund.com')) return user;
  } catch (err) {}

  localStorage.setItem('auth0ReturnUrl', window.location.href);
  return await auth0.client.loginWithRedirect(auth0Settings);
};

const requestService = async (token, url) => {
  if (!token) return null;
  if (!url) url = location.pathname;  
  const fetchOptions = {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}` 
    }
  };

  try {
    const result = await fetch(url, fetchOptions);
    return await result.json();
  } catch (error) {
    return null;
  }
};

const requestLinks = (token) => {
  const body = document.querySelector('body');
  body.addEventListener('click', async (e) => {
    const elem = e.target && e.target.closest('[data-request]');
    if (!(elem && token)) return;
    e.preventDefault();
    const url = elem.getAttribute('href');
    const originalInnerHTML = elem.innerHTML;
    elem.innerHTML = 'In progress...';
    await requestService(token, url);
    elem.innerHTML = 'Done';
    setTimeout(() => {
      elem.innerHTML = originalInnerHTML;
    }, 2000);
  });
};

(async () => {
  const user = await ensureAuth0Login();
  const token = user ? user.__raw : null;

  const result = await requestService(token);
  if (!result) return;
  const body = document.querySelector('body');

  switch (result.type) {
    case 'redirects' : 
      body.innerHTML = renderRedirects(result.body);
      break;
    case 'keys' : 
      body.innerHTML = renderCacheKeys(result.body);
      break;
    case 'keysdetail' : 
      body.innerHTML = renderCacheKeyDetail(result.body);
      break;
    case 'check' :
      check(token);
      break;
  }

  requestLinks(token);
})();