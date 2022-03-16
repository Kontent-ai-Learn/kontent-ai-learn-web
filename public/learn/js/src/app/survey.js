(() => {
  const requestFormData = async (itemCodename, courseid, user, token) => {
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
        codename: itemCodename,
        courseid: courseid,
        email: user.email,
        username: user.name
      })
    };

    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
    }
    const result = await fetch(`/learn/api/survey/`, fetchOptions);
    return await result.json();
  };

  const renderAnswers = (data, questionId) => {
    let markup = ``;
    for (let i = 0; i < data.length; i++) {
      markup += `<div class="answer">
        <div class="answer__wrapper">
          <div class="answer__form-elements">
            <input class="answer__radio" type="radio" tabindex="-1"
              value="${data[i].id}"
              id="n${data[i].id}"
              name="${questionId}">
            <label class="answer__radio-label" for="n${data[i].id}">${data[i].id}</label></div>
          <div class="answer__visual-elements">
            <div class="answer__content">
              ${data[i].html}
            </div>
            <a data-form-answer href="#n${data[i].id}" class="answer__link"></a>
          </div>
        </div>
      </div>`
    }
    return markup;
  };

  const renderQuestions = (data) => {
    let markup = ``;
    for (let i = 0; i < data.length; i++) {
      if (data[i].type === 'training_question_for_survey_and_test') {
        markup += `<fieldset class="question">
          <legend class="question__legend">${data[i].html}</legend>
            <div class="question__answers">`;   
        markup += renderAnswers(data[i].answers, data[i].id);
        markup += `</div></fieldset>`;
      } else if (data[i].type === 'training_question_free_text') {
        markup += `<fieldset class="question">
          <label class="question__legend" for="n${data[i].id}">${data[i].html}</label> 
          <textarea class="question__textarea" name="${data[i].id}" id="n${data[i].id}"></textarea>
        </fieldset>`;
      }
    }
    return markup;
  };

  const renderForm = (formData, container) => {
    const data = formData.data.questions;

    let markup = `<form class="survey__form" action="${window.location.pathname}" method="post" data-survey-form>`;
    markup += renderQuestions(data);
    markup += `<input type="hidden" name="attempt" value="${formData.data.id}">`;
    markup += `<button class="button survey__button"><span>Submit</span><span></span></button></form>`;

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

  const hideOverlay = () => {
    const overlay = document.querySelector('.survey__overlay');
    if (!overlay) return;
    overlay.classList.add('survey__overlay--hidden');
  };


  const getSurvey = async (user) => {
    if (!user) return;
    const token = user ? user.__raw : null;
    const elem = document.querySelector('[data-survey]');
    const codename = elem ? elem.getAttribute('data-survey') : null
    const courseid = window.helper.getParameterByName('courseid');
    if (!(token && codename && courseid)) return;
    const formData = await requestFormData(codename, courseid, user, token);
    console.log(formData);

    if (formData.code === 200) {
      renderForm(formData, elem);
      makeAnswersInteractive(elem);
      hideOverlay();
    } else if (formData.code === 401) {
      if (formData.data && formData.data.redirect_url) {
        window.location.replace(formData.data.redirect_url);
      } else {
        elem.innerHTML = `Access in now allowed.`;
      }
    }
  };

  const container = document.querySelector('[data-survey]');
  if (container) {
    window.addEventListener('load', () => {
      auth0.ensureUserSignedIn(async (user) => {
        await getSurvey(user);
      });
    });
  }
})();