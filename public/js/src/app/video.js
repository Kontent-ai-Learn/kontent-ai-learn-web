window.videoHelper = (() => {
  const handleLooping = (video, loopNum) => {
    let counter = 0;
    video.play();
    video.addEventListener('ended', () => {
      counter++;
      if (counter < loopNum) {
        video.play();
      }
    })
  };

  const togglePlayPauseControls = (playing, video) => {
    const container = video.parentNode;
    const play = container.querySelector('.video-controls__play');
    const pause = container.querySelector('.video-controls__pause');

    if (playing) {
      play.classList.add('video-controls__play--hidden');
      pause.classList.remove('video-controls__pause--hidden');
    } else {
      play.classList.remove('video-controls__play--hidden');
      pause.classList.add('video-controls__pause--hidden');
    }
  };

  const addPlayPauseControls = (video, container) => {
    const play = document.createElement('div');
    play.classList.add('video-controls__play');
    play.classList.add('video-controls__elem');
    play.addEventListener('click', () => {
      video.play();
      togglePlayPauseControls(true, video);
    });
    container.appendChild(play);

    const pause = document.createElement('div');
    pause.classList.add('video-controls__pause');
    pause.classList.add('video-controls__elem');
    pause.addEventListener('click', () => {
      video.pause();
      togglePlayPauseControls(false, video);
    });
    container.appendChild(pause);

    video.addEventListener('play', () => {
      togglePlayPauseControls(true, video);
    });

    video.addEventListener('pause', () => {
      togglePlayPauseControls(false, video);
    });
  };

  const handleCustomControls = (video, controls) => {
    const controlsContainer = document.createElement('div');
    controlsContainer.classList.add('video-controls__container');
    video.parentNode.appendChild(controlsContainer);

    for (let i = 0; i < controls.length; i++) {
      switch (controls[i]) {
        default: addPlayPauseControls(video, controlsContainer);
      }
    }
  };

  const init = (config) => {
    if (!(config && config.elem)) return;

    if (config.customControls) {
      handleCustomControls(config.elem, config.customControls);
    }

    if (config.loop) {
      const loopNum = parseInt(config.loop);
      if (!isNaN(loopNum)) {
        handleLooping(config.elem, loopNum);
      } else {
        config.elem.setAttribute('loop', '');
      }
    };
  };

  const initLightbox = (elem) => {
    const video = elem.querySelector('video');
    if (!video) return;
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
  }

  return {
    init: init,
    initLightbox: initLightbox
  }
})();