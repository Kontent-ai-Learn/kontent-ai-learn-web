(() => {
  const startTimer = (selector) => {
    const display =  document.querySelector(selector);
    if(!display) return;
    const duration = parseInt(display.getAttribute('data-timer'));
    let timer = duration, hours, minutes, seconds;

    const interval = setInterval(() => {
        hours = parseInt(timer / 3600, 10);
        minutes = parseInt((timer % 3600) / 60, 10);
        seconds = parseInt((timer % 3600) % 60, 10);

        minutes = minutes < 10 ? `0${minutes}` : minutes;
        seconds = seconds < 10 ? `0${seconds}` : seconds;

        display.textContent = `${hours ? `${hours}:` : ''}${minutes}:${seconds}`;

        if (--timer < 0) {
            clearInterval(interval);

            const submitButton = document.querySelector('.certification-test__button');
            if (submitButton) submitButton.click();
        }
    }, 1000);
}

  const makeUserSignIn = () => {
    auth0.login();
  };
  
  const ensureUserSignedIn = (callback) => {
    let ktcCounter = 0; // Interval counter
    let user;

    // Wait until auth0.client is available
    const interval = setInterval(async () => {
        const auth0Client = auth0.client;
        let success = true;
        if (auth0Client) {
          try {
            await auth0.client.getTokenSilently();
            user = await auth0.client.getIdTokenClaims();
          } catch (err) {
            success = false;
          }
          if (typeof user !== 'undefined') {
            clearInterval(interval);
            callback(user);
          }
        }
        if (ktcCounter > 10) {
          success = false;
        }
        if (!success) {
          clearInterval(interval);
          makeUserSignIn();
        }
        ktcCounter++;
    }, 500);
  };

  const requestFormData = async (itemCodename, user, token) => {
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
        codename: itemCodename,
        email: user.email,
        username: user.name
      })
    };

    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
    }
    const result = await fetch(`/learn/api/get-certified/`, fetchOptions);
    return await result.json();
  };

  const renderAnswers = (data, questionCodename) => {
    let markup = ``;
    for (let i = 0; i < data.length; i++) {
      markup += `<div class="answer">
        <div class="answer__wrapper">
          <div class="answer__form-elements">
            <input class="answer__radio" type="radio" tabindex="-1"
              value="${data[i].codename}"
              id="${data[i].codename}"
              name="${questionCodename}">
            <label class="answer__radio-label" for="${data[i].codename}">${data[i].codename}</label></div>
          <div class="answer__visual-elements">
            <div class="answer__content">
              ${data[i].html}
            </div>
            <a data-form-answer href="#${data[i].codename}" class="answer__link"></a>
          </div>
        </div>
      </div>`
    }
    return markup;
  };

  const renderQuestions = (data) => {
    let markup = ``;
    for (let i = 0; i < data.length; i++) {
      markup += `<fieldset class="question">
        <legend class="question__legend">${data[i].html}</legend>
          <div class="question__answers">`;
      markup += renderAnswers(data[i].answers, data[i].codename);
      markup += `</div></fieldset>`;
    }
    return markup;
  };

  const renderTopics = (data) => {
    let markup = ``;
    for (let i = 0; i < data.length; i++) {
      markup += renderQuestions(data[i].questions);
    }
    return markup;
  };

  const renderForm = (formData, container) => {
    const data = formData.data.test.questions;

    const attemptStart = new Date(formData.data.start);
    const attemptStartDurationSec = attemptStart.getTime() / 1000 + formData.data.test.duration * 60;
    const nowSec = (new Date()).getTime() / 1000;

    let markup = `<span class="certification-test__timer" data-timer="${Math.round(attemptStartDurationSec - nowSec)}"></span>
      <form class="certification-test__form" action="${window.location.pathname}" method="post" data-certification-test-form>
    `;
    markup += renderTopics(data);
    markup += `<input type="hidden" name="attempt" value="${formData.data.id}">`;
    markup += `<button class="button certification-test__button"><span>Submit</span><span></span></button></form>`;

    container.innerHTML = markup;
  };

  const makeAnswersInteractive = (elem) => {
    elem.delegateEventListener('click', '[data-form-answer]', function (e) {
      e.preventDefault();
      const answserCodename = this.getAttribute('href');
      const answerInput = document.querySelector(answserCodename);
      if (!answerInput) return;
      answerInput.checked = true;
      e.stopPropagation();
    });
  };

  const renderNextAttemptMessage = (formData, container) => {
    const attemptStart = new Date(formData.data.start);
    attemptStart.setDate(attemptStart.getDate() + 1);
    const now = new Date();
    const diffSec = Math.round((attemptStart - now) / 1000);

    const markup = `You didn\’t pass this time. You can try again in <span data-timer="${diffSec}"></span>.`;
    container.innerHTML = markup;
  };

  const setFormState = (storageName, property, value) => {
    let state = localStorage.getItem(storageName);

    if (state) {
      state = JSON.parse(state);
    } else {
      state = {};
    }
    state[property] = value;
    localStorage.setItem(storageName, JSON.stringify(state));
  };

  const getFormState = (storageName) => {
    let state = localStorage.getItem(storageName);
    if (!state) return;

    state = JSON.parse(state);
    for (const property in state) {
      if (Object.prototype.hasOwnProperty.call(state, property)) {
        const answerInput = document.querySelector(`[name="${property}"][value="${state[property]}"]`);
        if (answerInput) {
          answerInput.checked = true;
        }
      }
    }
  };

  const persistFormState = (elem) => {
    const storageName = elem.getAttribute('data-certification-test');
    getFormState(storageName);
    elem.delegateEventListener('click', '[data-form-answer]', function (e) {
      e.preventDefault();
      const answserCodename = this.getAttribute('href');
      const answerInput = document.querySelector(answserCodename);
      if (!answerInput) return;
      setFormState(storageName, answerInput.getAttribute('name'), answerInput.value);
      e.stopPropagation();
    });
  };

  const getCertificationTest = async (user) => {
    if (!user) return;
    const token = user ? user.__raw : null;
    const elem = document.querySelector('[data-certification-test]');
    const codename = elem ? elem.getAttribute('data-certification-test') : null
    if (!(token && codename)) return;
    const formData = await requestFormData(codename, user, token);
    console.log(formData);

    if (formData.code === 302) {
      window.location.href = `${window.location.protocol}//${window.location.host}${window.location.pathname}${formData.data.id}/`;
    } else if (formData.code === 200) {
      renderForm(formData, elem);
      makeAnswersInteractive(elem);
      persistFormState(elem);
    } else {
      renderNextAttemptMessage(formData, elem);
    }
  };

  const removeFormState = () => {
    const elem = document.querySelector('[data-certification-result]');
    if (!elem) return;
    const codename = elem.getAttribute('data-certification-result');
    localStorage.removeItem(codename);
  };

  
  let container = document.querySelector('[data-certification-result]');
  if (container) {
    removeFormState();
    startTimer('[data-timer]');
  }

  container = document.querySelector('[data-certification-test]');
  if (container) {
    window.addEventListener('load', () => {
      ensureUserSignedIn(async (user) => {
        await getCertificationTest(user);
        startTimer('[data-timer]');
      });
    });
  }
})();