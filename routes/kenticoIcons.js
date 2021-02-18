const express = require('express');
const router = express.Router();
const axios = require('axios');
const asyncHandler = require('express-async-handler');
const handleCache = require('../helpers/handleCache');
const fastly = require('../helpers/fastly');

router.get('/', asyncHandler(async (req, res) => {
    const icons = await handleCache.ensureSingle(res, 'kenticoIcons_', async () => {
        return await axios.get('https://cdn.jsdelivr.net/gh/Kentico/kentico-icons/production/icon-variables.less');
    });

    const lines = icons.data.split('\n');
    let css = '';

    for (let i = 0; i < lines.length; i++) {
        const rule = lines[i].split(':')
        if (rule.length === 2) {
            css += `${rule[0] ? rule[0].replace('@', '.') : ''}:before{content:${rule[1] ? rule[1].trim().replace(';', '') : ''}}`;
        }
    }

    res.header('Content-Type', 'text/css');
    res = fastly.immutableFileCaching(res);

    return res.send(css);
}));

module.exports = router;
