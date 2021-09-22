const express = require('express');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const router = express.Router();

const jwtCheck = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_CLIENT_ID,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

router.post('/training-course/detail/public', (req, res) => {
  return res.status(201).send({ codename: req.body.codename, public: true });
});

router.post('/training-course/detail/private', jwtCheck, (req, res) => {
  return res.status(201).send({ token: req.headers.authorization, codename: req.body.codename, public: false });
});

module.exports = router;
