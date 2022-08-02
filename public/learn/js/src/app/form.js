(() => {
    const clearMessages = (form, formType) => {
        if (formType === 'feedback') {
            const message = document.querySelector('.feedback__message');
            if (message) {
                message.classList.add('feedback__message--hidden');
            }
        }

        form.querySelectorAll('[data-form-error]').forEach((item) => {
            item.innerHTML = '';
        });
    };

    const disableInputs = (form, recaptchaCover) => {
        form.querySelectorAll('.form__input').forEach((item) => {
            item.setAttribute('disabled', 'disabled');
        });

        recaptchaCover.classList.add('form__recaptcha-disabled--visible');
    };

    const addLoadingToButton = (button) => {
        if (!button) return;
        button.classList.add('form__button--loading');
    };

    const collectData = (form, formType) => {
        var data = {};
        if (formType === 'feedback') {
            const feedback = form.querySelector('#feedback');
            if (feedback) {
                data.feedback = feedback.value;
            }
        }
        data.email = form.querySelector('#email').value;
        data['g-recaptcha-response'] = window.grecaptcha.getResponse();
        data.url = window.location.href;
        return data;
    };
    
    const submitData = async (endpoint, data) => {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        return response.json();
    };

    const enableInputs = (form, recaptchaCover) => {
        form.querySelectorAll('.form__input:not([data-disabled])').forEach((item) => {
            item.removeAttribute('disabled');
        });

        recaptchaCover.classList.remove('form__recaptcha-disabled--visible');
    };

    const removeLoadingFromButton = (button) => {
        if (!button) return;
        button.classList.remove('form__button--loading');
    };

    const clearForm = (form) => {
        form.querySelectorAll('.form__input').forEach((item) => {
            item.value = '';
        });
    };

    const displaySuccessMessage = (message, responseWrapper, formType) => {
        if (formType === 'feedback') {
            const messageYes = document.querySelector('.feedback__message--yes');
            const messageNo = document.querySelector('.feedback__message--no');
            if (messageYes) {
                messageYes.classList.remove('feedback__message--hidden');
            }

            if (messageNo) {
                messageNo.classList.add('feedback__message--hidden');
            }
        }

        if (!responseWrapper) return;
        const successMessage = document.createElement('div');
        successMessage.classList.add('lightbox-form__success');
        successMessage.innerHTML = `<p>${message}</p>`;
        responseWrapper.appendChild(successMessage);
    };

    const displayValidationMessages = (data, form) => {
        for (var item in data) {
            if (Object.prototype.hasOwnProperty.call(data, item)) {
                const errorElem = form.querySelector(`[data-form-error="${item}"]`);
                if (errorElem) {
                    errorElem.innerHTML = data[item];
                }
            }
        }
    };

    const processData = (data, form, responseWrapper, recaptchaCover, submitButton, formType) => {
        enableInputs(form, recaptchaCover);
        removeLoadingFromButton(submitButton);
        window.grecaptcha.reset();
        if (data.isValid) {
            clearForm(form);
            hideForm(form);
            displaySuccessMessage(data.success, responseWrapper, formType);
        } else {
            displayValidationMessages(data, form);
        }
    };

    const hideForm = (elem) => {
        const form = elem.querySelector('.form');
        if (!form) return;
        form.classList.add('form--hidden');
    };

    const validateAndSubmitForm = async (elem, button, callback) => {
        const form = elem.querySelector('form');
        if (!form) return;
        if (!form.checkValidity()) {
            // Create the temporary button, click and remove it
            var tmpSubmit = document.createElement('button');
            form.appendChild(tmpSubmit);
            tmpSubmit.click();
            form.removeChild(tmpSubmit);
        } else {
            if (!button.classList.contains('form__button--loading')) {
                await callback();
            }
        }
    };

    const processForm = (form) => {
        const submitButton = form.querySelector('.form__button');
        const recaptchaCover = form.querySelector('.form__recaptcha-disabled');
        const responseWrapper = form.querySelector('.lightbox-form__response-wrapper');
        const formType = form.getAttribute('data-lightbox-form');
    
        submitButton.addEventListener('click', (e) => {
            e.preventDefault();
            validateAndSubmitForm(form, e.target, async () => {
                clearMessages(form, formType);
                disableInputs(form, recaptchaCover);
                addLoadingToButton(submitButton);
                const data = collectData(form, formType);
                const response = await submitData(`/learn/form/${formType}`, data);
                processData(response, form, responseWrapper, recaptchaCover, submitButton, formType);
            });
        });
    };

    const lightboxForms = document.querySelectorAll('[data-lightbox-form]');
    lightboxForms.forEach((form) => {
        processForm(form);
    });
})();
