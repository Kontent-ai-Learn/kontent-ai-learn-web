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

  scrollToQueryParam();
})();