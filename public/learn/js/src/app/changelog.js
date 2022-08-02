(() => {
  const wrapper = document.querySelector('[data-lightbox-form="changelog"]');
  if (!wrapper) return;
	const form = wrapper.querySelector('.lightbox-form__form');
  const closeElem = wrapper.querySelector('.lightbox-form__close');

  if (!form) return;

  const init = () => {
    document.querySelectorAll('[href="#subscribe-breaking-changes-email"]').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        wrapper.classList.remove('lightbox-form--hidden');
        form.classList.remove('lightbox-form__form--hidden');
        window.helper.loadRecaptcha();
      });
    });
  };

  const close = () => {
    if (closeElem) {
      closeElem.addEventListener('click', () => {
            wrapper.classList.add('lightbox-form--hidden');
        });
    }

    if (wrapper) {
      wrapper.addEventListener('click', (event) => {
          if (event.target && !event.target.matches('.lightbox-form__response-wrapper') && !event.target.matches('.lightbox-form__response-wrapper *')) {
              closeElem.click();
          }
      });
    }
  };

  init();
  close();
})();