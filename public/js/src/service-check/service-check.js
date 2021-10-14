(() => {
  const config = [{
    codename: 'kkproject',
    title: 'Kentico Kontent project',
    endpoint: '/service-check/kk-project'
  }, {
    codename: 'algolia',
    title: 'Algolia search',
    endpoint: '/service-check/algolia',
  }, {
    codename: 'subscriptionService',
    title: 'Subscription service',
    endpoint: '/service-check/subscription-service',
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