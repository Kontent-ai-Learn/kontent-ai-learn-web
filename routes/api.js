const express = require('express');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const router = express.Router();
const trainingCourseDetail = require('../helpers/trainingCourseDetail');
const certificationAttempt = require('../helpers/certification/attempt');
const certificationDetail = require('../helpers/certification/detail');
const fastly = require('../helpers/fastly');

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

router.post('/training-course/detail/private', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await trainingCourseDetail(req.body.codename, req, res);
  return res.send(data);
});

router.post('/training-course/detail/public', async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await trainingCourseDetail(req.body.codename, req, res);
  return res.send(data);
});

router.post('/training-certification/detail/private', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await certificationDetail.get(req.body.codename, req, res);
  return res.send(data);
});

router.post('/training-certification/detail/public', async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await certificationDetail.get(req.body.codename, req, res);
  return res.send(data);
});

router.post('/get-certified', jwtCheck, async (req, res) => {
  res = fastly.preventCaching(res);
  const data = await certificationAttempt.init(req.body, res);
  return res.send(data);
});

module.exports = router;
