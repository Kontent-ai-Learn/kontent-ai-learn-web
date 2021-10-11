window.initSmartLink = (() => {
  const disableLinks = () => {
    document.body.addEventListener('click', function (e) {
      if (e.target.matches('a:not(.navigation__link):not(.sub-navigation__link):not(.language-selector__link)')) e.preventDefault();
    });
  };

  const initSDK = () => {
    if (typeof KontentSmartLink !== 'undefined') {
      KontentSmartLink.initialize();

      let intervalCount = 0;
      const interval = setInterval(() => {
        intervalCount++;
        const elem = document.querySelector('kontent-smart-link-element');
        if (elem) {
          clearInterval(interval);
          window.kontentSmartLinkEnabled = true;
          disableLinks();
          document.body.classList.add('kontent-smart-link-enabled');
        } else if (intervalCount > 20) {
          clearInterval(interval);
        }
      }, 200);
    }
  };

  const addSmartLinkQS = () => {
    const subNavigationLinks = document.querySelectorAll('.sub-navigation__link, .language-selector__link');

    for (let i = 0; i < subNavigationLinks.length; i++) {
      let href = subNavigationLinks[i].getAttribute('href');
      if (href === '#') continue;
      const qs = href.split('?');

      if (qs[1]) {
        href += '&';
      } else {
        href += '?';
      }

      subNavigationLinks[i].setAttribute('href', href + 'kontent-smart-link-enabled');
    }
  };

  return () => {
    initSDK();
    
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('kontent-smart-link-enabled')) {
      addSmartLinkQS();
    }
  };
})();

window.resolveSmartLink = {
  elementCodename: (codename) => {
    return `data-kontent-element-codename="${codename}"`;
  }
};
