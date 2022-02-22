(() => {
  const surveyForm = document.querySelector('[data-survey-form]');
  if (!surveyForm) return;
  
  const setSurveyEmailInput = async () => {
    const emailInput = surveyForm.querySelector('input[name="email"]');
    if (!(emailInput && auth0)) return;

    let ktcCounter = 0; // Interval counter
    let user;
    const interval = setInterval(async () => { // Start interval with 500ms timer
        const auth0Client = auth0.client;
        if (auth0Client) { // If client is available
            user = await auth0.client.getUser(); // Get user
            if (typeof user !== 'undefined') {
              emailInput.value = user.email;
              clearInterval(interval); // Stop the interval
            }
        }
        if (ktcCounter > 10) {
          emailInput.value = 'User is not signed in';
          clearInterval(interval); // Stop the interval
        } 
        ktcCounter++;
    }, 500);
  };

  const setCourseIdInput = () => {
    const courseIdInput = surveyForm.querySelector('input[name="courseid"]');
    if (!courseIdInput) return;

    const courseIdQS = window.helper.getParameterByName('courseid');
    if (!courseIdQS) {
      courseIdInput.value = 'Course ID unavailable';
      return;
    }
    courseIdInput.value = courseIdQS;
  };
  
  window.addEventListener('load', async () => {
    setCourseIdInput();
    await setSurveyEmailInput();
  });
})();