require('dotenv').config();
const appInsights = require('applicationinsights');
const { CosmosClient } = require('@azure/cosmos');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const logger = require('morgan');
const serveStatic = require('serve-static');
const slashes = require('connect-slashes');
const consola = require('consola');

const { setIntervalAsync } = require('set-interval-async/dynamic');

const { handleKCKeys, getProjectLanguage } = require('./helpers/general/app');
const cacheHandle = require('./helpers/cache/handle');
const isPreview = require('./helpers/kontent/isPreview');
const fastly = require('./helpers/services/fastly');
// const github = require('./helpers/services/github');
// const certificationEmail = require('./helpers/certification/email');

const siteRouter = require('./routes/siteRouter');
const error = require('./routes/error');
const opensearch = require('./routes/opensearch');
const sitemap = require('./routes/sitemap');
const service = require('./routes/service');
const auth0Callback = require('./routes/auth0Callback');

const app = express();

// Azure Application Insights monitors
if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights.setup();
  appInsights.start();
  exports.appInsights = appInsights;
}

if (process.env.COSMOSDB_ENDPOINT && process.env.COSMOSDB_KEY) {
  const cosmosClient = new CosmosClient({ endpoint: process.env.COSMOSDB_ENDPOINT, key: process.env.COSMOSDB_KEY });
  exports.cosmosClient = cosmosClient;
}

if (!process.env.BASE_URL.includes('localhost')) {
  app.set('trust proxy', 1);
}

app.locals.deployVersion = (new Date()).getTime();
app.locals.changelogPath = '';
app.locals.terminologyPath = '';

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(compression());
app.use(logger('dev'));
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(serveStatic(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css') || path.endsWith('.js')) {
      res = fastly.immutableFileCaching(res);
    } else {
      res = fastly.staticFileCaching(res);
    }
  }
}));

app.enable('trust proxy');

app.use(async (req, res, next) => {
  res.locals.host = req.headers.host;
  res.locals.protocol = req.protocol;
  handleKCKeys(req, res);

  if (req.cookies['connect.sid']) res.clearCookie('connect.sid');

  res = fastly.handleGlobalCaching(req, res);

  if (isPreview(res.locals.previewapikey)) {
    await getProjectLanguage(res);
  }
  return next();
});

app.use('/learn/sitemap.xml', sitemap);
app.use('/learn/opensearch.xml', opensearch);
app.use(slashes(true));

app.use('/learn/callback', auth0Callback);
app.use('/learn/service', service);

app.use('/learn', siteRouter);
app.use('/', (req, res) => res.redirect(301, '/learn/'));

if (!isPreview(process.env.KONTENT_PREVIEW_API_KEY)) {
  setIntervalAsync(async () => {
    await cacheHandle.pool();
    // await certificationEmail.handleExpirationNotifications();
  }, 300000);
} else {
  setIntervalAsync(async () => {
   // await github.requestRedoclySync();
}, 300000);
}

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
  await cacheHandle.evaluateCommon(res, ['notFound']);
  return error(req, res);
});

module.exports = app;
