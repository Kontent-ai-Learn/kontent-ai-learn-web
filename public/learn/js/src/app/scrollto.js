(() => {
  const scrollToQueryParam = () => {
    const val = window.helper.getParameterByName('scrollto');
    if (val) {
      document.querySelector(`#${val}`).scrollIntoView({
        block: 'start',
        behavior: 'smooth'
      });
    }
  };

  const handleDefaultAnchorScrollOnPageLoad = () => {
    if (window.location.hash.length > 0) {
      setTimeout(() => {
        const elem = document.querySelector(window.location.hash);
        if (!elem) return;
        elem.scrollIntoView();
      }, 0);
    };
  }

  handleDefaultAnchorScrollOnPageLoad(); // Fix for Firefox wrong scrolling
  scrollToQueryParam();
})();