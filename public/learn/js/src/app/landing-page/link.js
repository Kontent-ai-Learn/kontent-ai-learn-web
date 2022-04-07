(() => {
  const handleUrl = (e) => {
    const el = e.target.closest('[data-lp-link]');
    if (!el) return;
    e.preventDefault();
    const url = el.getAttribute('href');
    window.history.pushState('', '', url);
    if (ga) {
      //ga('create', 'UA-134087903-1', 'auto');
      ga('send', 'pageview', url);
    }
  };

  const invokeLightbox = (e) => {
    const el = e.target.closest('[data-lp-lighbox-invoke]');
    if (!el) return;
    e.preventDefault();
    const codename = el.getAttribute('data-lp-lighbox-invoke');
    const item = document.querySelector(`[data-lp-lightbox][data-lp-item="${codename}"]`);
    if (!item) return;
    item.click();
  };


  document.querySelector('body').addEventListener('click', (e) => {
    handleUrl(e);
    invokeLightbox(e);
  });
})();

