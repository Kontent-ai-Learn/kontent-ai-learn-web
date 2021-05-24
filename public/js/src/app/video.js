window.videoHelper = (() => {
  const isVideoPlaying = (video) => {
    const container = video.parentNode;
    const playPause = container.querySelector('.video-controls__play-pause');
    return playPause ? playPause.classList.contains('video-controls__play-pause--playing') : false;
  }

  const togglePlayPauseControls = (video) => {
    const container = video.parentNode;
    const playPause = container.querySelector('.video-controls__play-pause');
    const playing = isVideoPlaying(video);

    if (playing) {
      playPause.classList.remove('video-controls__play-pause--playing');
    } else {
      playPause.classList.add('video-controls__play-pause--playing');
    }
  };

  const playPauseVideo = (video) => {
    const playing = isVideoPlaying(video);
    
    if (playing) {
      video.pause();
    } else {
      video.play();
    }
  };

  const addPlayPauseControls = (video, container) => {
    const labelPlay = window.UIMessages ? window.UIMessages.videoPlay : '';
    const labelPause = window.UIMessages ? window.UIMessages.videoPause : '';
    const play = document.createElement('a');
    play.setAttribute('href', '#');
    play.classList.add('video-controls__play-pause');
    play.classList.add('video-controls__elem');
    play.setAttribute('data-video-tooltip', '');
    play.setAttribute('data-video-tooltip-play', labelPlay);
    play.setAttribute('data-video-tooltip-pause', labelPause);
    play.innerHTML = '<span class="sr-only">Play/Pause video</span>';
    play.addEventListener('click', (e) => {
      e.preventDefault();
      if (!window.kontentSmartLinkEnabled) {
        playPauseVideo(video);
      }
    });
    container.appendChild(play);

    video.addEventListener('play', () => {
      hideReplayControls(container);
      togglePlayPauseControls(video);
    });

    video.addEventListener('pause', () => {
      togglePlayPauseControls(video);
    });
  };

  const handleLooping = (video, loopNum, container) => {
    let counter = 0;
    playPauseVideo(video);
    video.addEventListener('ended', () => {
      counter++;
      if (counter < loopNum) {
        playPauseVideo(video);
      } else {
        showReplayControls(container);
      }
    })
  };

  const addReplayControls = (video, container) => {
    const labelReplay = window.UIMessages ? window.UIMessages.videoReplay : '';
    const replay = document.createElement('div');
    replay.classList.add('video-controls__replay');
    replay.classList.add('video-controls__elem');
    replay.setAttribute('data-video-tooltip', labelReplay);
    replay.innerHTML = `<span class="sr-only">${labelReplay}</span>`;
    replay.addEventListener('click', () => {
      if (!window.kontentSmartLinkEnabled) {
        video.play();
        replay.classList.remove('video-controls__replay--visible');
      }
    });
    container.appendChild(replay);
  };

  const addLightboxControls = (container) => {
    const labelExpand = window.UIMessages ? window.UIMessages.videoExpand : '';
    const lightbox = document.createElement('a');
    lightbox.setAttribute('href', '#');
    lightbox.classList.add('video-controls__lightbox');
    lightbox.classList.add('video-controls__elem');
    lightbox.setAttribute('data-video-tooltip', labelExpand);
    lightbox.innerHTML = `<span class="sr-only">${labelExpand}</span>`;
    container.appendChild(lightbox);
  };

  const showReplayControls = (container) => {
    if (!container) return;
    const replay = container.querySelector('.video-controls__replay');
    replay.classList.add('video-controls__replay--visible');
  };

  const hideReplayControls = (container) => {
    if (!container) return;
    const replay = container.querySelector('.video-controls__replay');
    replay.classList.remove('video-controls__replay--visible');
  };

  const handleVideoLink = (container) => {
    const url = container.parentNode.getAttribute('data-video-url');
    if (!url) return;

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('target', '_blank');
    link.classList.add('video-controls__link');
    container.appendChild(link);
  };

  const handleCustomControls = (video, controls) => {
    const controlsContainer = document.createElement('div');
    controlsContainer.classList.add('video-controls__container');
    video.parentNode.appendChild(controlsContainer);

    handleVideoLink(controlsContainer);

    for (let i = 0; i < controls.length; i++) {
      switch (controls[i]) {
        case 'play/pause': 
          addPlayPauseControls(video, controlsContainer);
          break;
        case 'replay': 
          addReplayControls(video, controlsContainer);
          break;
        case 'lightbox': 
          addLightboxControls(controlsContainer);
          break;
      }
    }

    return controlsContainer;
  };

  const handleTooltips = (container) => {
    const tooltips = container.querySelectorAll('[data-video-tooltip]');

    const renderTooltip = (elem) => {
      const tooltip = document.createElement('div');
      tooltip.classList.add('video-controls__tooltip');
      const text = elem.getAttribute('data-video-tooltip');
      tooltip.innerHTML = text;
      elem.appendChild(tooltip);
    }

    const togglePlayPauseTooltip = (container) => {
      const video = container.parentNode.querySelector('video');
      const playPause = container.querySelector('.video-controls__play-pause');

      if (!(video && playPause)) return;
      const playPauseTooltip = playPause.querySelector('.video-controls__tooltip');
  
      video.addEventListener('play', () => {
        playPauseTooltip.innerHTML = playPause.getAttribute('data-video-tooltip-pause');
      });
  
      video.addEventListener('pause', () => {
        playPauseTooltip.innerHTML = playPause.getAttribute('data-video-tooltip-play');
      });
    };

    for (let i = 0; i < tooltips.length; i++) {
      renderTooltip(tooltips[i]);
    }

    togglePlayPauseTooltip(container);
  };

  const init = (config) => {
    if (!(config && config.elem)) return;
    let container;
    if (config.customControls) {
      container = handleCustomControls(config.elem, config.customControls);
    }

    if (config.loop) {
      const loopNum = parseInt(config.loop);
      if (!isNaN(loopNum)) {
        handleLooping(config.elem, loopNum, container);
      } else {
        config.elem.setAttribute('loop', '');
      }
    }

    handleTooltips(container);
  };

  return {
    init: init,
    playPauseVideo: playPauseVideo
  }
})();

const handleVideoKeyboardActions = () => {
  document.addEventListener('keydown', function (e)  {
    if (e.code !== 'Space') return;
    const containers = document.querySelectorAll('.video-controls');
    for (let i = 0; i < containers.length; i++) {
      if (containers[i].matches(':hover')) {
        e.preventDefault();
        const video = containers[i].querySelector('video');
        window.videoHelper.playPauseVideo(video);
      }
    }
  });
};
handleVideoKeyboardActions();