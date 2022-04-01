const express = require('express');
const router = express.Router();
const cacheHandle = require('../helpers/cache/handle');
const getContent = require('../helpers/kontent/getContent');
const helper = require('../helpers/general/helper');
const fastly = require('../helpers/services/fastly');

router.post('/', async (req, res) => {
    const event = req.body[0];
    const KCDetails = getContent.KCDetails(res);
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
        cacheHandle.remove(`reDocReference_${apiCodename}`, KCDetails);
        cacheHandle.deleteMultipleKeys('reference_');
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
