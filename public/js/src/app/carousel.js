(() => {
  const elms = document.getElementsByClassName('carousel');
  const options = {
    type: 'loop',
    autoplay: true,
    interval: 8000,
    arrowPath: 'M0.902,1.258 C1.883,0.401 2.744,1.258 2.744,1.258 L16.861,19.263 C16.861,19.263 17.674,20.299 17.680,20.900 C17.686,21.488 16.861,22.332 16.861,22.332 L2.948,40.337 C2.948,40.337 2.33,41.393 1.107,40.542 C0.145,39.657 0.902,38.700 0.902,38.700 L14.611,20.900 L0.698,2.895 C0.698,2.895 0.226,1.850 0.902,1.258 Z'
  };

  for (let i = 0; i < elms.length; i++) {
    elms[i].classList.add('carousel--init');
    new Splide(elms[i], options).mount();
  }
})();