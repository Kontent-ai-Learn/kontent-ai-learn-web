(() => {
  const surveyForm = document.querySelector('[data-survey-form]');
  if (!surveyForm) return;

  const hideOverlay = () => {
    const overlay = document.querySelector('.survey__overlay');
    if (!overlay) return;

    overlay.classList.add('survey__overlay--hidden');
  };

  const makeUserSignIn = () => {
    auth0.login();
  };
  
  const setSurveyEmailInput = async () => {
    const emailInput = surveyForm.querySelector('input[name="email"]');
    if (!(emailInput && auth0)) return;

    let ktcCounter = 0; // Interval counter
    let user;

    // Wait until auth0.client is available
    const interval = setInterval(async () => {
        const auth0Client = auth0.client;
        let success = true;
        if (auth0Client) {
          try {
            await auth0.client.getTokenSilently();
            await auth0.client.getIdTokenClaims();
            user = await auth0.client.getUser();
          } catch (err) {
            success = false;
          }
          if (typeof user !== 'undefined') {
            emailInput.value = user.email;
            clearInterval(interval);
            hideOverlay();
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

  const setCourseIdInput = () => {
    const courseIdInput = surveyForm.querySelector('input[name="courseid"]');
    if (!courseIdInput) return;

    const courseIdQS = window.helper.getParameterByName('courseid');
    if (!courseIdQS) {
      courseIdInput.value = 'unknown';
      return;
    }
    courseIdInput.value = courseIdQS;
  };

  const makeAnswersInteractive = () => {
    const survey = document.querySelector('[data-form-survey]');
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
  
  window.addEventListener('load', async () => {
    makeAnswersInteractive();
    setCourseIdInput();
    await setSurveyEmailInput();
  });
})();