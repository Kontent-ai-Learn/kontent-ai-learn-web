(() => {
  const copyAnchorUrl = () => {
    const content = document.querySelector('#main');
  
    if (content && window.UIMessages && window.UIMessages.copyAnchorLink) {
      const anchors = content.querySelectorAll('.anchor-copy');

      anchors.forEach((item) => {
        const tooltipElem = document.createElement('div');
        tooltipElem.innerHTML = (window.UIMessages ? window.UIMessages.copyAnchorLink : '');
        tooltipElem.classList.add('anchor-copy__tooltip');
        item.appendChild(tooltipElem);
      });

      content.addEventListener('click', (e) => {
        if (e.target && e.target.matches('.anchor-copy')) {
          const textElem = e.target.querySelector('.anchor-copy__tooltip');
          e.target.classList.add('anchor-copy--active');
          const text = textElem.innerHTML;
          textElem.innerHTML = (window.UIMessages ? window.UIMessages.copyAnchorLinkActive : '');
          setTimeout(() => {
            e.target.classList.remove('anchor-copy--active');
            textElem.innerHTML = text;
          }, 1500);
          const url = `${window.helper.getAbsoluteUrl().split('#')[0]}${e.target.getAttribute('href')}`;
          window.helper.copyToClipboard(url);
        }
      });
    }
  };

  copyAnchorUrl();
})();
