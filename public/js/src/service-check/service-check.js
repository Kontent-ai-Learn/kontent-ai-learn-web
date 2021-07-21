(() => {
  const config = [{
    codename: 'kkproject',
    title: 'Kentico Kontent project',
    endpoint: '/service-check/kk-project'
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

  const runChecks = () => {
    for (let i = 0; i < config.length; i++) {
      const liElem = document.querySelector(`[data-codename="${config[i].codename}"]`);
      const statusElem = liElem.querySelector('[data-status]');
      const messageElem = liElem.querySelector('[data-message]');

      fetch(config[i].endpoint)
        .then(response => response.json())
        .then(data => {
          if (data.isSuccess) {
            statusElem.setAttribute('data-status', 'success');
          } else {
            statusElem.setAttribute('data-status', 'fail');
          }

          if (data.message) {
            messageElem.innerHTML = data.message;
          } else {
            messageElem.innerHTML = '';
          }
        });
    }
  };

  buidlUI();
  runChecks();
})();