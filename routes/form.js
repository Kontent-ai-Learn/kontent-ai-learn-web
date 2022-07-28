const express = require('express');
const router = express.Router();
const getContent = require('../helpers/kontent/getContent');
const recaptcha = require('../helpers/services/recaptcha');
const jira = require('../helpers/services/jira');
const cacheHandle = require('../helpers/cache/handle');
const helper = require('../helpers/general/helper')

const setFalseValidation = (validation, property, UIMessages) => {
    validation.isValid = false;
    validation[property] = helper.getValue(UIMessages[0], 'form_field_validation___empty_field');
    return validation;
};

const validateReCaptcha = async (validation, data, UIMessages) => {
    const isRealUser = await recaptcha.checkv2(data);
    if (!isRealUser) {
        validation.isValid = false;
        validation['g-recaptcha-response'] = helper.getValue(UIMessages[0], 'form_field_validation___recaptcha_message');
    }
    return validation;
};

const validateDataFeedback = async (data, res) => {
    const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
        return getContent.UIMessages(res);
    });

    let validation = {
        isValid: true
    };

    if (!data.feedback) {
        validation = setFalseValidation(validation, 'feedback', UIMessages);
    }

    validation = await validateReCaptcha(validation, data, UIMessages);

    if (validation.isValid) {
        validation.success = helper.getValue(UIMessages[0], 'feedback_form___yes_message');
        await jira.createIssue(data);
    }

    return validation;
};

const manageRequest = async (req, res, validate) => {
    const data = JSON.parse(req.body);

    const validation = await validate(data, res);
    return res.json(validation);
};

router.post('/feedback', async (req, res) => {
    return await manageRequest(req, res, validateDataFeedback);
});

module.exports = router;
