require('dotenv').config();
const appInsights = require('applicationinsights');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const logger = require('morgan');
const asyncHandler = require('express-async-handler');
const cacheControl = require('express-cache-controller');
const serveStatic = require('serve-static');
const slashes = require('connect-slashes');
const consola = require('consola');
const axios = require('axios');
const cache = require('memory-cache');
const util = require('util');
const { setIntervalAsync } = require('set-interval-async/dynamic')
const session = require('express-session');
const { auth } = require('express-openid-connect');

const helper = require('./helpers/helperFunctions');
const appHelper = require('./helpers/app');
const handleCache = require('./helpers/handleCache');
const commonContent = require('./helpers/commonContent');
const isPreview = require('./helpers/isPreview');

const home = require('./routes/home');
const tutorials = require('./routes/tutorials');
const sitemap = require('./routes/sitemap');
const rss = require('./routes/rss');
const robots = require('./routes/robots');
const kenticoIcons = require('./routes/kenticoIcons');
const urlMap = require('./routes/urlMap');
const urlAliases = require('./routes/urlAliases');
const redirectUrls = require('./routes/redirectUrls');
const referenceUpdated = require('./routes/referenceUpdated');
const linkUrls = require('./routes/linkUrls');
const cacheInvalidate = require('./routes/cacheInvalidate');
const reference = require('./routes/reference');
const error = require('./routes/error');
const form = require('./routes/form');
const redirectRules = require('./routes/redirectRules');
const generatePDF = require('./routes/generatePDF');
const authorize = require('./routes/auth');

const app = express();

// Azure Application Insights monitors
if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights.setup();
  appInsights.start();
  exports.appInsights = appInsights;
}

// Auth0 authentication setup
// Session
const sess = {
  secret: process.env.AUTH0_SESSION_SECRET,
  cookie: { sameSite: true },
  resave: false,
  saveUninitialized: true
};

// https://github.com/auth0/passport-auth0/issues/70#issuecomment-570004407
if (!process.env.baseURL.includes('localhost')) {
  sess.cookie.secure = true;
  sess.proxy = true;
  app.set('trust proxy', 1);
}

app.use(session(sess));

// Auth0
const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: process.env.AUTH0_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: helper.ensureProtocol(process.env.AUTH0_DOMAIN),
  secret: process.env.AUTH0_SESSION_SECRET,
  routes: {
    login: false,
    postLogoutRedirect: '/e-learning/overview'
  }
};

app.use(auth(config));

app.locals.deployVersion = (new Date()).getTime();
app.locals.changelogPath = '';
app.locals.terminologyPath = '';
app.locals.elearningPath = '';

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(serveStatic(path.join(__dirname, 'public'), {
  maxAge: 31536000000,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://tracker.kontent.ai');
  }
}));
app.use(slashes(false));

app.use(cacheControl({
  noCache: true
}));

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/cache-invalidate')) {
    res.cacheControl = {
      noStore: true,
      private: true
    };
  }
  return next();
});

app.enable('trust proxy');

app.use(async (req, res, next) => {
  res.locals.host = req.headers.host;
  res.locals.protocol = req.protocol;
  res.locals.isKenticoIP = helper.isKenticoIP(req);
  appHelper.handleKCKeys(req, res);
  res.setHeader('Arr-Disable-Session-Affinity', 'True');
  if (!(isPreview(res.locals.previewapikey) || (req.originalUrl.indexOf('/cache-invalidate') > -1))) {
    res.setHeader('Surrogate-Control', 'max-age=3600');
  }
  return next();
});

// Routes
app.use('/link-to', linkUrls);
app.use('/reference-updated', bodyParser.json({
  type: '*/*'
}), referenceUpdated);
app.use('/cache-invalidate', bodyParser.text({
  type: '*/*'
}), cacheInvalidate);
app.use('/', redirectRules);
app.use('/form', bodyParser.text({
  type: '*/*'
}), form);
app.use('/kentico-icons.min.css', kenticoIcons);
app.use('/', asyncHandler(async (req, res, next) => {
  if (appHelper.isOneOfCacheRevalidate(req)) {
    await handleCache.evaluateCommon(res, ['platformsConfig', 'urlMap', 'footer', 'UIMessages', 'home', 'navigationItems', 'articles', 'scenarios', 'termDefinitions']);

    const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
      return await commonContent.getUIMessages(res);
    });
    if (UIMessages && UIMessages.length) {
      res.locals.UIMessages = UIMessages[0];
    }

    await handleCache.cacheAllAPIReferences(res);
  }
  const exists = await appHelper.pageExists(req, res, next);
  if (!exists) {
    return await urlAliases(req, res, next);
  }
  return next();
}));
app.use('/', home);
app.use('/redirect-urls', redirectUrls);
app.use('/sitemap.xml', sitemap);
app.use('/rss', rss);
app.use('/robots.txt', robots);
app.use('/pdf', generatePDF);
app.get('/urlmap', urlMap);
app.use('/', authorize);

// Dynamic routing setup
app.use('/', async (req, res, next) => {
  const topLevel = req.originalUrl.split('/')[1];
  const navigationItems = await handleCache.ensureSingle(res, 'navigationItems', async () => {
    return commonContent.getNavigationItems(res);
  });

  if (navigationItems) {
    res.locals.router = navigationItems.filter(item => topLevel === item.url.value);
  }

  if (res.locals.router && res.locals.router.length && res.locals.router[0].type.value.length) {
    res.locals.router = res.locals.router[0].type.value[0].codename;
  } else {
    res.locals.router = 'tutorials';
  }

  return next();
}, tutorials, reference);

// Check aliases on whitelisted url paths that do not match any routing above
app.use('/', asyncHandler(async (req, res, next) => {
  return await urlAliases(req, res, next);
}));

setIntervalAsync(async () => {
  const log = {
    timestamp: (new Date()).toISOString(),
    pool: util.inspect(cache.get('webhook-payload-pool'), {
        maxArrayLength: 500
    })
  };

  try {
    const response = await axios.post(`${process.env.baseURL}/cache-invalidate/pool`, {});
    log.url = response && response.config ? response.config.url : '';
  } catch (error) {
    log.error = error && error.response ? error.response.data : '';
  }

  appHelper.logPool(log);
}, 300000);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  return next(err);
});

// error handler
app.use(async (err, req, res, _next) => { // eslint-disable-line no-unused-vars
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  consola.error(err.stack);

  if (appInsights && appInsights.defaultClient) {
    appInsights.defaultClient.trackTrace({
      message: `${err.stack}${req.headers.referer ? `\n\nReferer request header value: ${req.headers.referer}` : ''}`
    });
  }

  // render the error page
  req.err = err;
  await handleCache.evaluateCommon(res, ['notFound']);
  return error(req, res);
});

module.exports = app;
