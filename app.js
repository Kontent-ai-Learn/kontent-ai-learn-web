require('dotenv').config();
const appInsights = require('applicationinsights');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const logger = require('morgan');
const serveStatic = require('serve-static');
const slashes = require('connect-slashes');
const consola = require('consola');

const { setIntervalAsync } = require('set-interval-async/dynamic');
const asyncHandler = require('express-async-handler');

const appHelper = require('./helpers/app');
const handleCache = require('./helpers/handleCache');
const isPreview = require('./helpers/isPreview');
const fastly = require('./helpers/fastly');
const serviceCheckAll = require('./helpers/serviceCheck/all');
const certificationEmail = require('./helpers/certification/email');

const siteRouter = require('./routes/siteRouter');
const serviceCheck = require('./routes/serviceCheck');
const error = require('./routes/error');
const opensearch = require('./routes/opensearch');
const sitemap = require('./routes/sitemap');

const app = express();

// Azure Application Insights monitors
if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights.setup();
  appInsights.start();
  exports.appInsights = appInsights;
}

if (!process.env.baseURL.includes('localhost')) {
  app.set('trust proxy', 1);
}

app.locals.deployVersion = (new Date()).getTime();
app.locals.changelogPath = '';
app.locals.terminologyPath = '';
app.locals.elearningPath = '';

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
  appHelper.handleKCKeys(req, res);

  if (req.cookies['connect.sid']) res.clearCookie('connect.sid');

  res = fastly.handleGlobalCaching(req, res);

  if (isPreview(res.locals.previewapikey)) {
    await appHelper.getProjectLanguage(res);
  }
  return next();
});

app.use('/learn/sitemap.xml', sitemap);
app.use('/learn/opensearch.xml', opensearch);
app.use(slashes(true));

app.use('/learn/service-check', serviceCheck);

if (process.env.isProduction === 'false') {
  app.use('/learn', asyncHandler(async (req, res, next) => {
    if (app.get('serviceCheckError') || !app.get('serviceCheckInitialialDone')) {
      const serviceCheckResults = await serviceCheckAll();
      let errored = false;

      for (let i = 0; i < serviceCheckResults.length; i++) {
        if (!serviceCheckResults[i].result.isSuccess) {
          errored = true;
        }
      }

      app.set('serviceCheckError', errored);
      app.set('serviceCheckInitialialDone', true);

      if (errored) {
        if (appInsights && appInsights.defaultClient) {
          appInsights.defaultClient.trackTrace({ message: `SERVICE_CHECK_ERROR: ${JSON.stringify(serviceCheckResults)}` });
        }
        return res.redirect(303, `${process.env.baseURL}/learn/service-check/`);
      }
    }
    next();
  }));
}

app.use('/learn', siteRouter);
app.use('/', (req, res) => res.redirect(301, '/learn/'));

setIntervalAsync(async () => {
  await handleCache.poolCache();
  await certificationEmail.handleExpirations();
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
