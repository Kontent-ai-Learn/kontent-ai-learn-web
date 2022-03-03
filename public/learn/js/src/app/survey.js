(() => {
  const surveyForm = document.querySelector('[data-survey-form]');
  if (!surveyForm) return;

  const hideOverlay = () => {
    const overlay = document.querySelector('.survey__overlay');
    if (!overlay) return;

    overlay.classList.add('survey__overlay--hidden');
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

    auth0.ensureUserSignedIn(async (user) => {
      const emailInput = surveyForm.querySelector('input[name="email"]');
      if (!emailInput) return;
      emailInput.value = user.email;
      hideOverlay();
    });
  });
})();