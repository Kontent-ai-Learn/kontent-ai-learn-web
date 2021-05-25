window.initSmartLink = (() => {
  const disableLinks = () => {
    document.body.addEventListener('click', function (e) {
      if (e.target.matches('a')) e.preventDefault();
    });
  };

  const initSDK = () => {
    if (typeof KontentSmartLink !== 'undefined') {
      KontentSmartLink.initialize();
      window.kontentSmartLinkEnabled = true;
      disableLinks();
      document.body.classList.add('kontent-smart-link-enabled');
    }
  };

  const addSmartLinkQS = () => {
    const subNavigationLinks = document.querySelectorAll('.sub-navigation__link');

    for (let i = 0; i < subNavigationLinks.length; i++) {
      let href = subNavigationLinks[i].getAttribute('href');
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
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('kontent-smart-link-enabled')) {
      initSDK();
      addSmartLinkQS();
    }
  };
})();
