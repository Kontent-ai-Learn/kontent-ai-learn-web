const survey = (() => {
  const requestFormData = async (courseid, user, token) => {
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
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

  const renderContent = (formData, container) => {
    const title = container.querySelector('[data-survey="title"]');
    const introduction = container.querySelector('[data-survey="introduction"]');

    if (title) title.innerHTML = JSON.parse(formData.content.title);
    if (introduction) introduction.innerHTML = JSON.parse(formData.content.introduction);
  }

  const getSurvey = async (user, container) => {
    if (!user) return;
    const token = user ? user.__raw : null;
    const elemQuestions = container.querySelector('[data-survey="questions"]');
    const courseid = window.helper.getParameterByName('courseid');
    if (!(token && courseid)) return;
    const formData = await requestFormData(courseid, user, token);

    if (formData.code === 200) {
      renderContent(formData, container)
      renderForm(formData, elemQuestions);
      makeAnswersInteractive(elemQuestions);
      hideOverlay();
    } else if (formData.code === 401) {
      if (formData.data && formData.data.redirect_url) {
        window.location.replace(formData.data.redirect_url);
      } else {
        elemQuestions.innerHTML = `Access in now allowed.`;
      }
    }
  };

  const getInfo = async () => {
    const container = document.querySelector('[data-form-survey]');
    if (container) {
      const user = await auth0.ensureUserSignedIn();
      if (user) {
        await getSurvey(user, container);
      } else {
        await auth0.login();
      }
    }
  };

  return {
    getInfo: getInfo
  };
})();