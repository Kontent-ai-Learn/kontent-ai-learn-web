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
    await auth0.client.getTokenSilently();
    const user = await auth0.client.getIdTokenClaims();
    if (user.email.endsWith('@kentico.com') || user.email.endsWith('@milanlund.com')) return user;
  } catch (err) {}

  localStorage.setItem('auth0ReturnUrl', window.location.href);
  return await auth0.client.loginWithRedirect(auth0Settings);
};

const requestService = async (token) => {
  if (!token) return null;
  const fetchOptions = {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}` 
    }
  };

  try {
    const result = await fetch(location.pathname, fetchOptions);
    return await result.json();
  } catch (error) {
    return null;
  }
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
  }
})();