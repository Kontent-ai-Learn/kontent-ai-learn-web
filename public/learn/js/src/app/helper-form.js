window.helperForm = (() => {
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

    const validateAndSubmitForm = (form, button, callback) => {
        if (!form.checkValidity()) {
            // Create the temporary button, click and remove it
            var tmpSubmit = document.createElement('button');
            form.appendChild(tmpSubmit);
            tmpSubmit.click();
            form.removeChild(tmpSubmit);
        } else {
            if (!button.classList.contains('form__button--loading')) {
                callback();
            }
        }
    };

    const enableInputs = (form, recaptchaCover) => {
        form.querySelectorAll('.form__input').forEach((item) => {
            item.removeAttribute('disabled');
        });

        recaptchaCover.classList.remove('form__recaptcha-disabled--visible');
    };

    const disableInputs = (form, recaptchaCover) => {
        form.querySelectorAll('.form__input').forEach((item) => {
            item.setAttribute('disabled', 'disabled');
        });

        recaptchaCover.classList.add('form__recaptcha-disabled--visible');
    };

    const addLoadingToButton = (button) => {
        button.classList.add('form__button--loading');
    };

    const removeLoadingFromButton = (button) => {
        button.classList.remove('form__button--loading');
    };

    const submitData = (endpoint, data, callback) => {
        return window.helper.ajaxPost(endpoint, data, callback, 'json');
    };

    const clearForm = (form) => {
        form.querySelectorAll('.form__input').forEach((item) => {
            item.value = '';
        });
    };

    const hideForm = (form) => {
        form.classList.add('form--hidden');
    };

    const submitForm = (settings) => {
        settings.clearMessages();
        disableInputs(settings.form, settings.recaptchaCover);
        addLoadingToButton(settings.submitButton);
        var data = settings.collectData();
        window.helperForm.submitData(settings.endpoint, data, settings.processData);
    };

    return {
        displayValidationMessages: displayValidationMessages,
        validateAndSubmitForm: validateAndSubmitForm,
        enableInputs: enableInputs,
        disableInputs: disableInputs,
        addLoadingToButton: addLoadingToButton,
        removeLoadingFromButton: removeLoadingFromButton,
        submitData: submitData,
        clearForm: clearForm,
        hideForm: hideForm,
        submitForm: submitForm
    }
})();
