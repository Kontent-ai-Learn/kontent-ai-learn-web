(() => {
  const initAuth0 = async () => {
    const auth0 = {};
    const auth0Settings = {
        domain: window.auth0Config.domain,
        client_id: window.auth0Config.clientID,
        redirect_uri: `${location.protocol}//${location.host}${window.helper.setUrlPathPrefix()}/callback`,
        scope: 'openid email profile'
    };
    auth0.client = await createAuth0Client(auth0Settings);

    const data = {
      isSuccess: false,
      message: ''
    }

    try {
      await auth0.client.getTokenSilently();
      await auth0.client.getIdTokenClaims();
      data.isSuccess = true;
    } catch (err) {
      if (err.error === 'login_required') {
        data.isSuccess = true;
      } else {
        data.message = 'Most likely there is a problem with at least one of the envs: AUTH0_CLIENT_ID, AUTH0_ISSUER_BASE_URL, AUTH0_DOMAIN'
      }
    }

    return data;
  };

  const config = [{
    codename: 'kkproject',
    title: 'Kentico Kontent project',
    endpoint: `${window.helper.setUrlPathPrefix()}/service-check/kk-project`
  }, {
    codename: 'algolia',
    title: 'Algolia search',
    endpoint: `${window.helper.setUrlPathPrefix()}/service-check/algolia`,
  }, {
    codename: 'subscriptionService',
    title: 'Subscription service',
    endpoint: `${window.helper.setUrlPathPrefix()}/service-check/subscription-service`,
  }, {
    codename: 'apiReferences',
    title: 'API References',
    endpoint: `${window.helper.setUrlPathPrefix()}/service-check/api-references`,
  }, {
    codename: 'tlms',
    title: 'TLMS',
    endpoint: `${window.helper.setUrlPathPrefix()}/service-check/tlms`,
  }, {
    codename: 'auth0',
    title: 'Auth0',
    endpoint: `${window.helper.setUrlPathPrefix()}/service-check/auth0`,
    callback: initAuth0
  }, {
    codename: 'sendgrid',
    title: 'Sendgrid',
    endpoint: `${window.helper.setUrlPathPrefix()}/service-check/sendgrid`,
  }];

  const buidlUI = () => {
    const body = document.getElementsByTagName('body')[0];
    let markup = '<ul class="service-check">';

    for (let i = 0; i < config.length; i++) {
      markup += `
        <li data-codename="${config[i].codename}" class="service-check__item">
          <span data-title class="service-check__title">${config[i].title}</span>
          <span data-status class="service-check__status"></span>
          <span data-message class="service-check__message"></span>
        </li>`;
    }

    markup += '</ul>';
    body.innerHTML = markup;
  };

  const runChecks = async () => {
    for (let i = 0; i < config.length; i++) {
      const liElem = document.querySelector(`[data-codename="${config[i].codename}"]`);
      const statusElem = liElem.querySelector('[data-status]');
      const messageElem = liElem.querySelector('[data-message]');

      try {
        const response = await fetch(config[i].endpoint);
        const data = await response.json();

        if (data.message) {
          messageElem.innerHTML = data.message;
        } else {
          messageElem.innerHTML = '';
        }

        if (data.isSuccess) {
          if (config[i].callback) {
            const callbackResult = await config[i].callback();

            if (callbackResult.isSuccess) {
              statusElem.setAttribute('data-status', 'success');
            } else {
              statusElem.setAttribute('data-status', 'fail');
              messageElem.innerHTML = callbackResult.message;
            }
          } else {
            statusElem.setAttribute('data-status', 'success');
          }    
        } else {
          statusElem.setAttribute('data-status', 'fail');
        }
      } catch (error) {
        statusElem.setAttribute('data-status', 'fail');
        messageElem.innerHTML = `Unable to check service ${config[i].title}`;
      }
    }
  };

  buidlUI();
  runChecks();
})();