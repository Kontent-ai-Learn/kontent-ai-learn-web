window.landingPageSliders = [];
const landingPageSliders = (() => {
  const initSliders = () => {
    const elms = document.querySelectorAll('.landing-page__items .splide, .survey__courses .splide');

    const options = {
      gap: '36px',
      perPage: 3,
      perMove: 1,
      pagination: false,
      arrowPath: 'M0.902,1.258 C1.883,0.401 2.744,1.258 2.744,1.258 L16.861,19.263 C16.861,19.263 17.674,20.299 17.680,20.900 C17.686,21.488 16.861,22.332 16.861,22.332 L2.948,40.337 C2.948,40.337 2.33,41.393 1.107,40.542 C0.145,39.657 0.902,38.700 0.902,38.700 L14.611,20.900 L0.698,2.895 C0.698,2.895 0.226,1.850 0.902,1.258 Z',
      breakpoints: {
        1024: {
          perPage: 2,
          gap: '24px',
        },
        640: {
          perPage: 1,
        },
      }
    };
  
    for (let i = 0; i < elms.length; i++) {
      elms[i].classList.add('landing-page__items--init');
      const splideInstance = new Splide(elms[i], options);
      splideInstance.mount();
      window.landingPageSliders.push(splideInstance);
    }
  };

  initSliders();

  return {
    initSliders
  }
})();