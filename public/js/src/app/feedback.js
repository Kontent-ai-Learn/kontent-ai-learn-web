(() => {
    const yesBtn = document.querySelector('.feedback__button--yes');
    const noBtn = document.querySelector('.feedback__button--no');
    const yesMsg = document.querySelector('.feedback__message--yes');
    const noMsg = document.querySelector('.feedback__message--no');
    const btnArea = document.querySelector('.feedback__answer');
    const form = document.querySelector('.feedback-form__form');
    const wrapper = document.querySelector('.feedback-form');
    const close = document.querySelector('.feedback-form__close');
    const posted = document.querySelector('.feedback--posted');

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
            if (e.target.matches('.feedback__button--yes') || e.target.matches('.feedback__button--yes span')) {
                onBtnClick(yesBtn, yesMsg, 1);
            } else if (e.target.matches('.feedback__button--no') || e.target.matches('.feedback__button--no span')) {
                onBtnClick(noBtn, noMsg, 0);
            }
        }
    };

    const onBtnClick = (btn, msg, value) => {
        btnArea.removeEventListener('click', handleFeedback);
        btnArea.classList.add('feedback__answer--answered');
        btn.classList.add('feedback__button--active');

        if (msg) {
            msg.classList.remove('feedback__message--hidden');
        }

        if (!posted) {
            sendFeedback(value);
        }

        if (form && value === 0) {
            wrapper.classList.remove('feedback-form--hidden');
            form.classList.remove('feedback-form__form--hidden');
            window.helper.loadRecaptcha();
        }
    };

    const closeFeedback = () => {
        if (close) {
            close.addEventListener('click', () => {
                wrapper.classList.add('feedback-form--hidden');
                noBtn.classList.add('feedback-form__button--closed');
                yesBtn.classList.add('feedback-form__button--closed');
            });
        }
    };

    if (wrapper) {
        wrapper.addEventListener('click', (event) => {
            if (event.target && !event.target.matches('.feedback-form__response-wrapper') && !event.target.matches('.feedback-form__response-wrapper *')) {
                close.click();
            }
        });
    }

    if (yesMsg && noMsg && !posted) {
        btnArea.addEventListener('click', handleFeedback)
    }

    if (yesMsg && noMsg) {
        yesMsg.classList.add('feedback__message--hidden');
        noMsg.classList.add('feedback__message--hidden');
    }

    if (form && !posted) {
        form.classList.add('feedback-form__form--hidden');
    }

    if (posted) {
        onBtnClick(noBtn, noMsg, 0);

        if (form) {
            form.classList.remove('feedback-form__form--hidden');
        }
    }

    closeFeedback();
})();
