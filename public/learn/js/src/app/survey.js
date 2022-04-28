const survey = (() => {
  const initFormSubmitAction = (token) => {
    const form = document.querySelector('[data-survey-form]');
    if (!form) return;

    const readData = () => {
      const data = {};
      const inputs = form.querySelectorAll('input[type="radio"]:checked, textarea, input[type="hidden"]');
      for (let i = 0; i < inputs.length; i++) {
        data[inputs[i].getAttribute('name')] = inputs[i].value;
      }
      return data;
    };

    const afterSubmit = async (token) => {
      const afterElem = document.querySelector('[data-survey="after"]');
      if (afterElem) {
        afterElem.classList.add('survey__after--loading');
      }

      const data = readData();
      [window.userElearningData, window.userProfile] = await Promise.all([submitData(data, token), landingPage.requestUserProfile(token)]);
      const response = window.userElearningData || {};

      if (afterElem) {
        afterElem.innerHTML = `
          <div class="survey__thanks">${response.messages.thank_you}</div>
          <div class="survey__certificate">
            <a href="${response.certificate.url}" target="_blank">${UIMessages.downloadCertificate}</a>
            <a href="${`https://www.linkedin.com/profile/add?startTask=${response.certificate.name}&name=${response.certificate.name}&organizationId=373060&issueYear=${response.certificate.issued[0]}&issueMonth=${response.certificate.issued[1]}&${response.certificate.expiration ? `expirationYear=${response.certificate.expiration[0]}&expirationMonth=${response.certificate.expiration[1]}` : ''}&certUrl=${!response.certificate.url.startsWith('http') ? `${window.location.protocol}//${window.location.host}` : ''}${response.certificate.url}`}" target="_blank">${window.UIMessages.addToLinkedIn}</a>
          </div>
          <div class="survey__message">${response.messages.cta_message}</div>
          <div class="survey__courses${response.courses.length < 3 ? ' survey__courses--no-arrows' : ''}">
            <div class="splide">
              <div class="splide__track">
                <ul class="splide__list">
                  ${response.courses.map(item => {
                    return `
                      <li class="splide__slide">
                        <div class="card" data-lp-lightbox data-lp-item="${item.id}"${item.comingSoon ? ' data-lp-comingsoon' : ''}>
                          ${item.image ? `<div class="card__img"><img src="${item.image}" data-lp-lightbox-data="image"></div>` : ''}
                          <div class="card__content">
                            <div class="card__top">
                              <ul class="card__tag-list" data-lp-lightbox-data="personas">
                                ${item.personas.map(persona => `<li class="card__tag" data-lp-persona="${persona.codename}">${persona.name}</li>`).join('')}        
                              </ul>
                              <h3 class="card__title" data-lp-lightbox-data="title">
                                ${item.title}
                                ${item.isFree ? `<span data-lp-lightbox-data="free" class="card__tag card__tag--green">${item.freeLabel}</span>` : ''}
                              </h3>
                              <div class="card__description" data-lp-lightbox-data="description">${item.description}</div>
                            </div>
                            <div class="card__bottom">
                              <div class="card__row card__row--space-between">
                                <div class="card__cta">${item.detailsLabel}</div>
                              </div>
                              <div class="card__row card__row--end">
                                ${item.duration ? `<div class="card__duration" data-lp-lightbox-data="duration">${item.duration} min</div>` : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    `
                  }).join('')}
                  <li class="splide__slide">
                    <div class="card card--plain">
                      <div class="card__content">
                        ${response.messages.back_title}
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        `;
        afterElem.classList.remove('survey__after--loading');
        afterElem.scrollIntoView({
          block: 'start',
          behavior: 'smooth'
        });
      }
      if (!window.landingPageSliders.length) {
        landingPageSliders.initSliders();
      }
      if (window.userProfile) {
        landingPage.handleToc(window.userProfile, window.user.email, token);
      }
    };

    const submitData = async (data, token) => {
      const fetchOptions = {
        method: 'POST',
        body: JSON.stringify(data)
      };
  
      if (token) {
        fetchOptions.headers = { Authorization: `Bearer ${token}` };
      }

      try {
        const result = await fetch(`/learn/api/survey/submit`, fetchOptions);
        return await result.json();
      } catch (error) {
        console.error(error);
      }
      
    };

    document.querySelector('body').addEventListener('click', async (e) => {
      const button = e.target.closest('[data-survey-form-submit]')
      if (!button) return;
      e.preventDefault();

      button.remove();
      await afterSubmit(token);
    });
    
  };

  const requestFormData = async (courseid, token) => {
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
        courseid: courseid,
        email: window.user.email,
        username: window.user.name
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

  const renderForm = (formData, container, token) => {
    const data = formData.data.questions;

    let markup = `<div class="survey__form" data-survey-form>`;
    markup += renderQuestions(data);
    markup += `<input type="hidden" name="attempt" value="${formData.data.id}">`;
    markup += `<button class="button survey__button" data-survey-form-submit><span>Submit</span><span></span></button></div>`;

    container.innerHTML = markup;

    initFormSubmitAction(token);
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

  const getSurvey = async (container) => {
    if (!window.user) return;
    const token = window.user.__raw;
    const elemQuestions = container.querySelector('[data-survey="questions"]');
    const courseid = window.helper.getParameterByName('courseid');
    if (!(token && courseid)) return;
    const formData = await requestFormData(courseid, token);

    if (formData.code === 200) {
      renderContent(formData, container)
      renderForm(formData, elemQuestions, token);
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
      window.user = await auth0.ensureUserSignedIn();
      if (window.user) {
        await getSurvey(container);
      } else {
        await auth0.login();
      }
    }
  };

  return {
    getInfo: getInfo
  };
})();