const express = require('express');
const router = express.Router();
const handleCache = require('../helpers/handleCache');
const commonContent = require('../helpers/commonContent');
const helper = require('../helpers/helperFunctions');
const fastly = require('../helpers/fastly');

router.post('/', async (req, res) => {
    const event = req.body[0];
    const KCDetails = commonContent.getKCDetails(res);
    let apiCodename;

    if (isValidationEvent(event)) {
        return await res.send({
            validationResponse: event.data.validationCode
        })
    }

    if (isValidEventGridEvent(event)) {
        apiCodename = event.data.apiReference;
    }

    if (isReferenceUpdatedEvent(event)) {
        await helper.getReferenceFiles(apiCodename, true, KCDetails, 'referenceUpdated');
        await fastly.purge(apiCodename, res);
    }

    if (isReferenceDeletedEvent(event)) {
        handleCache.deleteCache(`reDocReference_${apiCodename}`, KCDetails);
        handleCache.deleteMultipleKeys('reference_');
    }

    res.end();
});

const isValidationEvent = (event) =>
    isValidEventGridEvent(event) &&
    event.data.validationCode &&
    event.eventType.includes('Subscription');

const isReferenceUpdatedEvent = (event) =>
    isValidEventGridEvent(event) &&
    event.data.apiReference &&
    event.eventType.includes('UPDATE');

const isReferenceDeletedEvent = (event) =>
    isValidEventGridEvent(event) &&
    event.data.apiReference &&
    event.eventType.includes('DELETE');

const isValidEventGridEvent = (event) =>
    event &&
    event.data &&
    event.eventType;

module.exports = router;
