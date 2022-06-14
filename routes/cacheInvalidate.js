const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const { signatureHelper } = require('@kentico/kontent-webhook-helper');
const util = require('util');
const asyncHandler = require('express-async-handler');
const cacheInvalidate = require('../helpers/cache/invalidate');
const helper = require('../helpers/general/helper');

const isValidSignature = (req, secret) => {
    return signatureHelper.isValidSignatureFromString(req.body, secret, req.headers['x-kc-signature']);
};

const poolPayload = (req) => {
    const body = JSON.parse(req.body);
    const items = body.data.items;
    const message = body.message;
    const pool = cache.get('webhook-payload-pool') || [];

    for (let i = 0; i < items.length; i++) {
        let itemExists = false;

        for (let j = 0; j < pool.length; j++) {
            if (pool[j].codename === items[i].codename) {
                itemExists = true;
                pool[j].operation = message.operation;
            }
        }

        if (!itemExists) {
            items[i].operation = message.operation;
            pool.push(items[i]);
        }
    }

    cache.put('webhook-payload-pool', pool);
};

router.post('/', asyncHandler(async (req, res) => {
    const log = {
        timestamp: (new Date()).toISOString(),
        env: false,
        valid: false
    };

    if (process.env['Webhook.Cache.Invalidate.CommonContent']) {
        log.env = true;
        if (isValidSignature(req, process.env['Webhook.Cache.Invalidate.CommonContent'])) {
            log.valid = true;
            poolPayload(req, res);
        }
    }

    log.pool = util.inspect(cache.get('webhook-payload-pool'), {
        maxArrayLength: 500
    });

    helper.logInCacheKey('cache-invalidate', log);
    return res.end();
}));

router.post('/pool', asyncHandler(async (req, res) => {
    await cacheInvalidate(req, res);
    cache.del('webhook-payload-pool');
    return res.end();
}));

module.exports = router;
