(() => {
    let yesBtn = document.querySelector('.feedback__button--yes');
    let noBtn = document.querySelector('.feedback__button--no');
    let yesMsg = document.querySelector('.feedback__message--yes');
    let noMsg = document.querySelector('.feedback__message--no');
    let btnArea = document.querySelector('.feedback__answer');

    if (yesMsg && noMsg) {
        yesMsg.classList.add('feedback__message--hidden');
        noMsg.classList.add('feedback__message--hidden');
    }
    const sendFeedback = (value) => {
        window.dataLayer.push({
            'event': 'event',
            'eventCategory': 'feedback--submitted',
            'eventAction': 'Click',
            'eventLabel': window.location.pathname,
            'eventValue': value
        });
    };

    const onBtnClick = (btn, msg, value) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btnArea.parentElement.removeChild(btnArea);
            msg.classList.remove('feedback__message--hidden');
            sendFeedback(value);
        });
    };

    if (yesMsg && noMsg) {
        onBtnClick(yesBtn, yesMsg, 1);
        onBtnClick(noBtn, noMsg, 0);
    }
})();