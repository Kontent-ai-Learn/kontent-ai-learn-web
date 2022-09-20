const auth0 = {};
auth0.client = null;

const auth0Settings = {
    domain: window.auth0Config.domain,
    client_id: window.auth0Config.clientID,
    redirect_uri: `${location.protocol}//${location.host}/learn/callback/`,
    scope: 'openid email profile'
};

auth0.login = async () => {
    if (!auth0.client) return;
    localStorage.setItem('auth0ReturnUrl', window.location.href);
    await auth0.client.loginWithRedirect(auth0Settings);
};

auth0.logout = () => {
    if (!auth0.client) return;
    auth0.client.logout({
        returnTo: `${location.protocol}//${location.host}${window.auth0Config.logoutUrl}`
    });
};

auth0.signup = async () => {
    if (!auth0.client) return;
    localStorage.setItem('auth0ReturnUrl', window.location.href);
    await auth0.client.loginWithRedirect({ tab: 'signUp' });
};

auth0.eventListeners = () => {
    const logins = document.querySelectorAll('#login:not([data-listener])');
    const logouts = document.querySelectorAll('#logout:not([data-listener])');
    const signups = document.querySelectorAll('#signup:not([data-listener])');
    const intercoms = document.querySelectorAll('[data-click="support-async"]:not([data-listener])');

    logins.forEach((login) => {
        login.addEventListener('click', (e) => {
            e.preventDefault();
            auth0.login();
        });
        login.setAttribute('data-listener', '');
    });

    logouts.forEach((logout) => {
        logout.addEventListener('click', (e) => {
            e.preventDefault();
            auth0.logout();
        });
        logout.setAttribute('data-listener', '');
    });

    signups.forEach((signup) => {
        signup.addEventListener('click', (e) => {
            e.preventDefault();
            auth0.signup();
        });
        signup.setAttribute('data-listener', '');
    });

    intercoms.forEach((intercom) => {
        intercom.addEventListener('click', () => {
            if (window.Intercom && !window.kontentSmartLinkEnabled) {
                window.Intercom('show');
            }
        });
        intercom.setAttribute('data-listener', '');
    });
};

auth0.ensureUserSignedIn = async () => {
    if (!auth0.client) return null;
    try {
        await auth0.client.getTokenSilently();
        return await auth0.client.getIdTokenClaims();
    } catch (e) {
        return null;
    }
};

const configureClient = async () => {
    return await createAuth0Client(auth0Settings);
};

const processLoginState = async () => {
    const query = window.location.search;
    if (query.includes('code=') && query.includes('state=') && auth0.client) {
        await auth0.client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
        const returnUrl = localStorage.getItem('auth0ReturnUrl');
        localStorage.removeItem('auth0ReturnUrl');
        window.location.replace(returnUrl);
    }
};

const handleNavigationUI = () => {
    const navigation = document.querySelector('.navigation');
    if (!navigation) return;
    const navAuth = navigation.querySelector('[data-nav-auth]');
    if (!navAuth) return;

    const url = window.appUrl || 'https://app.kontent.ai';
    
    if (window.user) {
        navigation.classList.add('navigation--auth');
        navAuth.innerHTML = `
            <a href="${url}" class="navigation__link navigation__link--auth" target="_vlank">${window.UIMessages.goToProductButton}</a>
            <a href="#" class="navigation__link navigation__link--auth" id="logout">${window.UIMessages.signOut}</a>
        `
    } else {
        navAuth.innerHTML = `<a href="${url}/sign-in" class="navigation__link navigation__link--auth" target="_blank">${window.UIMessages.signIn}</a>`
    }
};

const removeOptionalFromLabel = (input) => {
    const id = input.getAttribute('id');
    const label = input.parentNode.querySelector(`label[for="${id}"]`);
    if (!label) return;
    let labelText = label.innerHTML;
    if (!labelText.includes('(optional)')) return;
    labelText = labelText.replace('(optional)', '').trim();
    label.innerHTML = labelText;
};

const prefillEmailAddressInForms = () => {
    if (!window.user) return;
    const emailInputs = document.querySelectorAll('input[type="email"]');

    for (let i = 0; i < emailInputs.length; i++) {
        emailInputs[i].value = window.user.email;
        if (emailInputs[i].classList.contains('form__input')) {
            emailInputs[i].classList.add('form__input--value');
            if (!emailInputs[i].hasAttribute('data-prevent-hiding-auth')) {
                emailInputs[i].parentNode.classList.add('hidden');
            }
            if (!emailInputs[i].hasAttribute('data-prevent-disabled')) {
                emailInputs[i].setAttribute('disabled', 'disabled');
                emailInputs[i].setAttribute('data-disabled', '');
            }
            removeOptionalFromLabel(emailInputs[i]);
        }
    }
};

(async () => {
    auth0.client = await configureClient();
    await processLoginState();
    window.user = await auth0.ensureUserSignedIn();
    handleNavigationUI();
    prefillEmailAddressInForms();

    if (typeof landingPage !== 'undefined') {
        await landingPage.getInfo();
    }
    if (typeof survey !== 'undefined') {
        await survey.getInfo();
    }
    if (typeof certificationTest !== 'undefined') {
        await certificationTest.getInfo();
    }
    if (typeof certificationTestResults !== 'undefined') {
        await certificationTestResults.getInfo();
    }
    auth0.eventListeners();
})();
