const auth0 = {};

const auth0Settings = {
    domain: window.auth0Config.domain,
    client_id: window.auth0Config.clientID,
    redirect_uri: `${location.protocol}//${location.host}/callback`,
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
        window.location.replace(returnUrl);
    }
};
/*
const provideInfo = async () => {
    let isAuthenticated = await auth0.client.isAuthenticated();
    
    if (isAuthenticated) {
        console.log('User is authenticated on the site.')
    } else {
        try {
            await auth0.client.getTokenSilently();
        } 
        catch (e) { }
        finally {
            isAuthenticated = await auth0.client.isAuthenticated();

            if (isAuthenticated) {
                console.log('User is authenticated through the app.')
            } else {
                console.log('User is not authenticated.')
            }   
        }
    }
};
*/
auth0.login = async () => {
    localStorage.setItem('auth0ReturnUrl', window.location.href);
    await auth0.client.loginWithRedirect(auth0Settings);
};

auth0.logout = () => {
    auth0.client.logout({
        returnTo: `${location.protocol}//${location.host}/e-learning/overview`
    });
};

window.addEventListener('load', async () => {
    await configureClient();
    await processLoginState();
    // provideInfo();
    await trainingCourse.getInfo();
});
