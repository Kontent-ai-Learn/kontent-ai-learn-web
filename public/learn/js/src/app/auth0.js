const auth0 = {};

const auth0Settings = {
    domain: window.auth0Config.domain,
    client_id: window.auth0Config.clientID,
    redirect_uri: `${location.protocol}//${location.host}/learn/callback/`,
    scope: 'openid email profile'
};

const configureClient = async () => {
    auth0.client = await createAuth0Client(auth0Settings);
};

const processLoginState = async () => {
    const query = window.location.search;
    if (query.includes('code=') && query.includes('state=')) {
        await auth0.client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
        const returnUrl = localStorage.getItem('auth0ReturnUrl');
        localStorage.removeItem('auth0ReturnUrl');
        const redirectUrl = returnUrl.includes('/e-learning/') ? `${returnUrl.split('#')[0]}#trainingAction`: returnUrl; 
        window.location.replace(redirectUrl);
    }
};

auth0.login = async () => {
    localStorage.setItem('auth0ReturnUrl', window.location.href);
    await auth0.client.loginWithRedirect(auth0Settings);
};

auth0.logout = () => {
    auth0.client.logout({
        returnTo: `${location.protocol}//${location.host}${window.auth0Config.logoutUrl}`
    });
};

auth0.signup = async () => {
    localStorage.setItem('auth0ReturnUrl', window.location.href);
    await auth0.client.loginWithRedirect({ tab: 'signUp' });
};

auth0.eventListeners = () => {
    const login = document.querySelector('#login');
    const logout = document.querySelector('#logout');
    const signup = document.querySelector('#signup');
    const intercom = document.querySelector('[data-click="support-async"]');

    if (login) {
        login.addEventListener('click', (e) => {
            e.preventDefault();
            auth0.login();
        });
    }

    if (logout) {
        logout.addEventListener('click', (e) => {
            e.preventDefault();
            auth0.logout();
        });
    }

    if (signup) {
        signup.addEventListener('click', (e) => {
            e.preventDefault();
            auth0.signup();
        });
    }

    if (intercom) {
        intercom.addEventListener('click', () => {
            if (window.Intercom && !window.kontentSmartLinkEnabled) {
                window.Intercom('show');
            }
        });
    }
};

auth0.ensureUserSignedIn = (callback) => {
    let counter = 0;
    let user;

    // Wait until auth0.client is available
    const interval = setInterval(async () => {
        const auth0Client = auth0.client;
        let success = true;
        if (auth0Client) {
          try {
            await auth0.client.getTokenSilently();
            user = await auth0.client.getIdTokenClaims();
          } catch (err) {
            success = false;
          }
          if (typeof user !== 'undefined') {
            clearInterval(interval);
            callback(user);
          }
        }
        if (counter > 10) {
          success = false;
        }
        if (!success) {
          clearInterval(interval);
          await auth0.login();
        }
        counter++;
    }, 500);
};

window.addEventListener('load', async () => {
    await configureClient();
    await processLoginState();
    await trainingCourse.getInfo();
});
