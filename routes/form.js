const express = require('express');
const router = express.Router();
const commonContent = require('../helpers/commonContent');
const recaptcha = require('../helpers/recaptcha');
const jira = require('../helpers/jira');
const handleCache = require('../helpers/handleCache');

const setFalseValidation = (validation, property, UIMessages) => {
    validation.isValid = false;
    validation[property] = UIMessages[0].form_field_validation___empty_field.value;
    return validation;
};

const validateReCaptcha = async (validation, data, UIMessages) => {
    const isRealUser = await recaptcha.checkv2(data);
    if (!isRealUser) {
        validation.isValid = false;
        validation['g-recaptcha-response'] = UIMessages[0].form_field_validation___recaptcha_message.value;
    }
    return validation;
};

const validateDataFeedback = async (data, req, res) => {
    const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
        return commonContent.getUIMessages(res);
    });

    let validation = {
        isValid: true
    };

    if (!data.feedback) {
        validation = setFalseValidation(validation, 'feedback', UIMessages);
    }

    validation = await validateReCaptcha(validation, data, UIMessages);

    if (validation.isValid) {
        validation.success = UIMessages[0].feedback_form___yes_message.value;
        await jira.createIssue(data);
    }

    return validation;
};

const manageRequest = async (req, res, validate) => {
    const data = JSON.parse(req.body);

    const validation = await validate(data, req, res);
    return res.json(validation);
};

router.post('/feedback', async (req, res) => {
    return await manageRequest(req, res, validateDataFeedback);
});

module.exports = router;
