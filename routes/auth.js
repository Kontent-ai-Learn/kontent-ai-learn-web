const express = require('express');
const router = express.Router();
const session = require('express-session');
const helper = require('../helpers/helperFunctions');

// Auth0 authentication setup
// Session
const sess = {
  secret: process.env.AUTH0_SESSION_SECRET,
  cookie: { sameSite: 'strict' },
  resave: false,
  saveUninitialized: true
};

// https://github.com/auth0/passport-auth0/issues/70#issuecomment-570004407
if (!process.env.baseURL.includes('localhost')) {
  sess.cookie.secure = true;
  sess.proxy = true;
}

// Docs: https://auth0.github.io/express-openid-connect/
router.get('/login', session(sess), (req, res) => {
  const returnTo = req.cookies.returnTo;
  res.clearCookie('returnTo');
  return res.oidc.login({
    returnTo: helper.appendQueryParam(returnTo, 'scrollto', 'trainingaction')
  });
});

router.get('/signup', session(sess), (req, res) => {
  const returnTo = req.cookies.returnTo;
  res.clearCookie('returnTo');
  return res.oidc.login({
    returnTo: helper.appendQueryParam(returnTo, 'scrollto', 'trainingaction'),
    authorizationParams: {
      tab: 'signUp'
    }
   });
});

module.exports = router;
