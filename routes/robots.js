const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    res.header('Content-Type', 'text/plain');
    res.render('pages/robots');
});

module.exports = router;