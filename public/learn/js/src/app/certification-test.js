(() => {
  const certificationTest = document.querySelector('[data-certification-test]');
  if (!certificationTest) return;

  const startTimer = (selector) => {
    const display =  document.querySelector(selector);
    const duration = parseInt(display.getAttribute('data-timer'));
    let timer = duration, hours, minutes, seconds;
    
    if(!display) return;

    const interval = setInterval(() => {
        hours = parseInt(timer / 3600, 10);
        minutes = parseInt((timer % 3600) / 60, 10);
        seconds = parseInt((timer % 3600) % 60, 10);

        minutes = minutes < 10 ? `0${minutes}` : minutes;
        seconds = seconds < 10 ? `0${seconds}` : seconds;

        display.textContent = `${hours ? `${hours}:` : ''}${minutes}:${seconds}`;

        if (--timer < 0) {
            clearInterval(interval);
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

  const requestFormData = async (itemCodename, email, token) => {
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
        codename: itemCodename,
        email: email
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
    const title = formData.data.test.title;
    const data = formData.data.test.questions;

    const attemptStart = new Date(formData.data.timestamp);
    const attemptStartDurationSec = attemptStart.getTime() / 1000 + formData.data.test.duration * 60;
    const nowSec = (new Date()).getTime() / 1000;

    let markup = `<span class="certification-test__timer" data-timer="${Math.round(attemptStartDurationSec - nowSec)}"></span>
      <h1 class="certification-test__heading">${title}</h1>
      <form class="certification-test__form" action="${window.location.pathname}" method="post" data-certification-test-form>
    `;
    markup += renderTopics(data);

    markup += `<button class="button certification-test__button"><span>Submit</span><span></span></button></form>`;

    container.innerHTML = markup;
  };

  const makeAnswersInteractive = () => {
    const survey = document.querySelector('[data-certification-test]');
    if (!survey) return;
    survey.delegateEventListener('click', '[data-form-answer]', function (e) {
      e.preventDefault();
      const answserCodename = this.getAttribute('href');
      const answerInput = document.querySelector(answserCodename);
      if (!answerInput) return;
      answerInput.checked = true;
      e.stopPropagation();
    });
  };

  const renderNextAttemptMessage = (formData, container) => {
    const attemptStart = new Date(formData.data.timestamp);
    attemptStart.setDate(attemptStart.getDate() + 1);
    const now = new Date();
    const diffSec = Math.round((attemptStart - now) / 1000);

    const markup = `You didn\’t pass this time. You can try again in <span data-timer="${diffSec}"></span>.`;
    container.innerHTML = markup;
  };

  const getCertificationTest = async (user) => {
    if (!user) return;
    const token = user ? user.__raw : null;
    const elem = document.querySelector('[data-certification-test]');
    const codename = elem ? elem.getAttribute('data-certification-test') : null
    if (!(token && codename)) return;
    const formData = await requestFormData(codename, user.email, token);
    console.log(formData);

    const headTitle = document.querySelector('title');
    if (headTitle) {
      headTitle.innerHTML = `${formData.data.test.title}${headTitle.innerHTML}`;
    }

    if (formData.code === 200) {
      renderForm(formData, elem);
      makeAnswersInteractive();
    } else {
      renderNextAttemptMessage(formData, elem);
    }
    startTimer('[data-timer]');
  };

  window.addEventListener('load', () => {
    ensureUserSignedIn(async (user) => {
      await getCertificationTest(user);
    });
  });
})();