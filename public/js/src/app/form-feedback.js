(() => {
    const formFeedback = document.querySelector('.feedback-form__form');
    if (formFeedback) {
        const submitButtonFeedback = formFeedback.querySelector('.form__button');
        const recaptchaCoverFeedback = formFeedback.querySelector('.form__recaptcha-disabled');

        const collectFeedbackData = () => {
            var data = {};
            data.feedback = formFeedback.querySelector('#feedback').value;
            data.email = formFeedback.querySelector('#email').value;
            data['g-recaptcha-response'] = window.grecaptcha.getResponse();
            data.url = window.location.href;
            return data;
        };

        const clearFeedbackMessages = () => {
            document.querySelector('.feedback__message').classList.add('feedback__message--hidden');
            formFeedback.querySelectorAll('[data-form-error]').forEach((item) => {
                item.innerHTML = '';
            });
        };

        const displaySuccessMessage = () => {
            document.querySelector('.feedback__message--yes').classList.remove('feedback__message--hidden');
            document.querySelector('.feedback__message--no').classList.add('feedback__message--hidden');
        };

        const processFeedbackData = (data) => {
            window.helperForm.enableInputs(formFeedback, recaptchaCoverFeedback);
            window.helperForm.removeLoadingFromButton(submitButtonFeedback);
            window.grecaptcha.reset();

            if (data.isValid) {
                window.helperForm.clearForm(formFeedback);
                window.helperForm.hideForm(formFeedback);
                document.querySelector('.feedback-form').classList.add('feedback-form--hidden');
                displaySuccessMessage();
            } else {
                window.helperForm.displayValidationMessages(data, formFeedback);
            }
        };

        const submitFeedbackForm = () => {
            window.helperForm.submitForm({
                clearMessages: clearFeedbackMessages,
                form: formFeedback,
                recaptchaCover: recaptchaCoverFeedback,
                processData: processFeedbackData,
                submitButton: submitButtonFeedback,
                collectData: collectFeedbackData,
                endpoint: '/form/feedback'
            });
        };

        submitButtonFeedback.addEventListener('click', (e) => {
            e.preventDefault();
            window.helperForm.validateAndSubmitForm(formFeedback, e.target, submitFeedbackForm);
        });
    }
})();
