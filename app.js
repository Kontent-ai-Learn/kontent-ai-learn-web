require('dotenv').config();
const appInsights = require('applicationinsights');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const logger = require('morgan');
const asyncHandler = require('express-async-handler');
const cache = require('memory-cache');
const cacheControl = require('express-cache-controller');
const serveStatic = require('serve-static');
const consola = require('consola');
const fs = require('fs');

const handleCache = require('./helpers/handleCache');
const renderReference = require('./helpers/renderReference');
const getUrlMap = require('./helpers/urlMap');

const home = require('./routes/home');
const tutorials = require('./routes/tutorials');
const sitemap = require('./routes/sitemap');
const rss = require('./routes/rss');
const robots = require('./routes/robots');
const kenticoIcons = require('./routes/kenticoIcons');
const urlAliases = require('./routes/urlAliases');
const redirectUrls = require('./routes/redirectUrls');
const linkUrls = require('./routes/linkUrls');
const previewUrls = require('./routes/previewUrls');
const cacheInvalidate = require('./routes/cacheInvalidate');
const reference = require('./routes/reference');
const error = require('./routes/error');
const form = require('./routes/form');

const app = express();

const urlWhitelist = [
  '/other/*',
  '/scenario/*',
  '/article/*',
  '/form/*',
  '/urlmap',
  '/kentico-icons.min.css',
  '/favicon.ico',
  '/api-reference',
  '/rss/articles',
  '/redirect-urls',
  '/cache-invalidate',
  '/robots.txt',
  '/link-to',
  '/sitemap.xml',
  '/render-reference',
  '/serve-reference'
];

// Azure Application Insights monitors
if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights.setup();
  appInsights.start();
  exports.appInsights = appInsights;
}

app.locals.deployVersion = (new Date()).getTime();

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
  maxAge: 2592000
}));
app.use(cacheControl({
  noCache: true
}));
app.enable('trust proxy');

const handleKCKeys = (req, res) => {
  if (typeof req.query.projectid !== 'undefined') {
    res.locals.projectid = req.query.projectid;
  } else {
    res.locals.projectid = process.env['KC.ProjectId'];
  }

  if (typeof req.query.previewapikey !== 'undefined') {
    res.locals.previewapikey = req.query.previewapikey;
  } else {
    res.locals.previewapikey = process.env['KC.PreviewApiKey'];
  }

  if (typeof req.query.securedapikey !== 'undefined') {
    res.locals.securedapikey = req.query.securedapikey;
  } else {
    res.locals.securedapikey = process.env['KC.SecuredApiKey'];
  }
};

const pageExists = async (req, res) => {
  const urlMap = await handleCache.evaluateSingle(res, `urlMap`, async () => {
    return await getUrlMap(res);
  });

  const path = req.originalUrl.split('?')[0];
  let exists = false;

  urlMap.forEach((item) => {
    const itemPath = item.url.split('?')[0];

    if (itemPath === path) {
      exists = true;
    }
  });

  if (!exists) {
    urlWhitelist.forEach((item) => {
      let itemPath = item.split('#')[0];
      itemPath = itemPath.split('?')[0];

      if (itemPath === path) {
        exists = true;
      } else if (itemPath.endsWith('/*')) {
        itemPath = itemPath.slice(0, -1);

        if (path.startsWith(itemPath)) {
          exists = true;
        }
      }
    });
  }

  return exists;
};

// Routes
app.use(async (req, res, next) => {
  handleKCKeys(req, res);

  return next();
});

app.use('/link-to', linkUrls);

app.use('/cache-invalidate', bodyParser.text({
  type: '*/*'
}), cacheInvalidate);

app.use('/', previewUrls);

app.use('/form', bodyParser.text({
  type: '*/*'
}), form);

app.use('/kentico-icons.min.css', kenticoIcons);

app.use('/', asyncHandler(async (req, res, next) => {
  if (!req.originalUrl.startsWith('/cache-invalidate') && !req.originalUrl.startsWith('/kentico-icons.min.css') && !req.originalUrl.startsWith('/form')) {
    await handleCache.evaluateCommon(res, ['platformsConfig', 'urlMap', 'footer', 'UIMessages', 'home', 'navigationItems']);
  }

  const exists = await pageExists(req, res, next);

  if (!exists) {
    await handleCache.evaluateCommon(res, ['articles']);
    return await urlAliases(req, res, next);
  }

  return next();
}));

app.use('/', home);

app.use('/redirect-urls', async (req, res, next) => {
  await handleCache.evaluateCommon(res, ['articles']);
  return next();
}, redirectUrls);

app.use('/sitemap.xml', sitemap);
app.use('/rss', async (req, res, next) => {
  await handleCache.evaluateCommon(res, ['rss_articles']);
  return next();
}, rss);
app.use('/robots.txt', robots);

app.get('/urlmap', asyncHandler(async (req, res) => {
  res.cacheControl = {
    maxAge: 0
  };
  return res.json(cache.get(`urlMap_${res.locals.projectid}`));
}));

// Reference
app.use('/render-reference', (req, res) => {
  renderReference('https://gist.githubusercontent.com/jancerman/3ca7767279c8713fdfa7c45e94d655f2/raw/f5f480909a450831438ab744b8b4cb5e7fd005b0/kcd%20proto%20all%20oas3.yml');
  return res.end();
});

app.get('/serve-reference', (req, res) => {
  fs.readFile('./redoc-static.html', (err, data) => {
    if (err) {
        throw err;
    }
    let result;

    if (Buffer.isBuffer(data)) {
      result = data.toString('utf8');
    }

    res.type('text/html; charset=utf8');
    return res.send(result);
  });
});

// Dynamic routing setup
app.use('/', (req, res, next) => {
  let topLevel = req.originalUrl.split('/')[1];
  let navigationItems = cache.get(`navigationItems_${res.locals.projectid}`);
  if (navigationItems) {
    res.locals.router = navigationItems.filter(item => topLevel === item.elements.url.value);
  }

  if (res.locals.router.length && res.locals.router[0].elements.type.value.length) {
    res.locals.router = res.locals.router[0].elements.type.value[0].codename;
  } else /* if (topLevel === 'other' || topLevel === 'article') */ {
    res.locals.router = 'tutorials';
  }

  return next();
}, tutorials, reference);

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
  consola.error(err.stack);
  if (appInsights && appInsights.defaultClient) {
    appInsights.defaultClient.trackTrace({
      message: 'ERR_STACK_TRACE: ' + err.stack
    });
  }
  // render the error page
  res.status(err.status || 500);
  req.err = err;
  await handleCache.evaluateCommon(res, ['not_found']);
  return error(req, res);
});

module.exports = app;
