let auth0 = null;

window.onload = async () => {
    await configureClient();
    await processLoginState();
    updateUI();
};

const auth0Settings = {
  domain: window.auth0Config.domain,
  client_id: window.auth0Config.clientID,
  redirect_uri: `${location.protocol}//${location.host}/callback`,
};

const configureClient = async () => {
    auth0 = await createAuth0Client(auth0Settings);
};

const processLoginState = async () => {
    // Check code and state parameters
    const query = window.location.search;
    if (query.includes("code=") && query.includes("state=")) {
        // Process the login state
        
        await auth0.handleRedirectCallback();
        console.log('y');
        // Use replaceState to redirect the user away and remove the querystring parameters
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

const updateUI = async () => {
    let isAuthenticated = await auth0.isAuthenticated();
    document.getElementById("btn-logout").disabled = !isAuthenticated;
    document.getElementById("btn-login").disabled = isAuthenticated;
    // NEW - add logic to show/hide gated content after authentication
    if (isAuthenticated) {
        document.getElementById("gated-content").classList.remove("hidden");
        document.getElementById("ipt-access-token").innerHTML = await auth0.getTokenSilently();
        document.getElementById("ipt-user-profile").innerHTML = JSON.stringify(await auth0.getUser());
    } else {
        console.log('x');
        try {
          await auth0.getTokenSilently();
        } catch (e) {
          
        }
        
        console.log('y');
        isAuthenticated = await auth0.isAuthenticated();
        console.log('u');
        document.getElementById("btn-logout").disabled = !isAuthenticated;
        document.getElementById("btn-login").disabled = isAuthenticated;

        if (isAuthenticated) {
          document.getElementById("gated-content").classList.remove("hidden");
          document.getElementById("ipt-access-token").innerHTML = await auth0.getTokenSilently();
          document.getElementById("ipt-user-profile").innerHTML = JSON.stringify(await auth0.getUser());
        } else {
          document.getElementById("gated-content").classList.add("hidden");
        }
    }
};

const login = async () => {
    await auth0.loginWithRedirect(auth0Settings);
};

const logout = () => {
    auth0.logout({
        returnTo: `${location.protocol}//${location.host}/e-learning/overview`
    });
};