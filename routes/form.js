const express = require('express');
const router = express.Router();
const axios = require('axios');
const getContent = require('../helpers/kontent/getContent');
const recaptcha = require('../helpers/services/recaptcha');
const jira = require('../helpers/services/jira');
const cacheHandle = require('../helpers/cache/handle');
const helper = require('../helpers/general/helper');
const errorAppInsights = require('../helpers/error/appInsights');

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

const validateDataChangelog = async (data, res) => {
    const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
        return getContent.UIMessages(res);
    });

    let validation = {
        isValid: true
    };

    if (!data.email) {
        validation = setFalseValidation(validation, 'email', UIMessages);
    }

    validation = await validateReCaptcha(validation, data, UIMessages);

    if (validation.isValid) {
        validation.success = 'You have been successfully subscribed.';
        try {
            await axios({
                method: 'get',
                url: `${process.env.PARDOT_CHANGELOG_SUBSCRIBE_URL}?email=${data.email}`,
            });
        } catch (error) {
            errorAppInsights.log('PARDOT_ERROR', error);
        }
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

router.post('/changelog', async (req, res) => {
    return await manageRequest(req, res, validateDataChangelog);
});

module.exports = router;
