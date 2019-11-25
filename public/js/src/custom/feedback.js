(() => {
    const yesBtn = document.querySelector('.feedback__button--yes');
    const noBtn = document.querySelector('.feedback__button--no');
    const yesMsg = document.querySelector('.feedback__message--yes');
    const noMsg = document.querySelector('.feedback__message--no');
    const btnArea = document.querySelector('.feedback__answer');
    const form = document.querySelector('.feedback__form');
    const wrapper = document.querySelector('.feedback__response-wrapper');
    const close = document.querySelector('.feedback__close');
    const posted = document.querySelector('.feedback--posted');

    const handleFixed = () => {
        const selector = document.querySelector('.feedback');
        const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

        if (viewportWidth >= 1150 && selector) {
            const topOffset = ((window.pageYOffset || document.scrollTop) - (document.clientTop || 0)) || 0;
            const main = document.querySelector('.navigation');
            const relativePositionTo = document.querySelector('.article__content h1');
            const isTop = topOffset <= main.getBoundingClientRect().top + main.offsetHeight + window.scrollY;

            selector.classList.add('feedback--loaded');

            if (isTop) {
                selector.classList.remove('feedback--visible');
                selector.style.top = relativePositionTo.getBoundingClientRect().top + 'px';
            } else {
                selector.classList.add('feedback--visible');
            }
        }
    };

    const sendFeedback = (value) => {
        if (!window.dataLayer) {
            window.dataLayer = [];
        }

        if (window.dataLayer) {
            window.dataLayer.push({
                event: 'event',
                eventCategory: 'feedback--submitted',
                eventAction: 'Click',
                eventLabel: window.location.pathname,
                eventValue: value
            });
        }
    };

    const handleFeedback = (e) => {
        e.preventDefault();
        if (e.target) {
            if (e.target.matches('.feedback__button--yes')) {
                onBtnClick(yesBtn, yesMsg, 1);
            } else if (e.target.matches('.feedback__button--no')) {
                onBtnClick(noBtn, noMsg, 0);
            }
        }
    };

    const onBtnClick = (btn, msg, value) => {
        btnArea.removeEventListener('click', handleFeedback);
        btnArea.classList.add('feedback__answer--answered');
        btn.classList.add('feedback__button--active');
        wrapper.classList.remove('feedback__response-wrapper--hidden');

        if (msg) {
            msg.classList.remove('feedback__message--hidden');
        }

        if (!posted) {
            sendFeedback(value);
        }

        if (form && value === 0) {
            form.classList.remove('feedback__form--hidden');
            window.helper.loadRecaptcha();
        }
    };

    const closeFeedback = () => {
        if (close) {
            close.addEventListener('click', () => {
                wrapper.classList.add('feedback__response-wrapper--hidden');
                noBtn.classList.add('feedback__button--closed');
                yesBtn.classList.add('feedback__button--closed');
            });
        }
    };

    if (form) {
        window.addEventListener('load', () => {
            handleFixed();
        });
        window.addEventListener('scroll', handleFixed, window.supportsPassive ? {
            passive: true
        } : false);
    }

    if (yesMsg && noMsg && !posted) {
        btnArea.addEventListener('click', handleFeedback)
    }

    if (yesMsg && noMsg) {
        yesMsg.classList.add('feedback__message--hidden');
        noMsg.classList.add('feedback__message--hidden');
    }

    if (form && !posted) {
        form.classList.add('feedback__form--hidden');
    }

    if (posted) {
        onBtnClick(noBtn, noMsg, 0);

        if (form) {
            form.classList.remove('feedback__form--hidden');
        }
    }

    closeFeedback();
})();
