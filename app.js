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
const cmd = require('node-cmd');

const handleCache = require('./helpers/handleCache');
const prerenderOptions = require('./helpers/redoc-cli/prerender-options.js');

const home = require('./routes/home');
const tutorials = require('./routes/tutorials');
const sitemap = require('./routes/sitemap');
const rss = require('./routes/rss');
const robots = require('./routes/robots');
const kenticoIcons = require('./routes/kenticoIcons');
const urlAliases = require('./routes/urlAliases');
const redirectUrls = require('./routes/redirectUrls');
const previewUrls = require('./routes/previewUrls');
const cacheInvalidate = require('./routes/cacheInvalidate');
const apiReference = require('./routes/apiReference');
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
  '/sitemap.xml'
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
app.use(cacheControl({ maxAge: 604800 }));
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

const pageExists = async (req, res, next) => {
  const urlMap = cache.get(`urlMap_${res.locals.projectid}`);
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

app.use('/cache-invalidate', bodyParser.text({ type: '*/*' }), cacheInvalidate);

app.use('/', previewUrls);

app.use('/form', bodyParser.text({ type: '*/*' }), form);

app.use('/kentico-icons.min.css', kenticoIcons);

app.use('/', asyncHandler(async (req, res, next) => {
  if (!req.originalUrl.startsWith('/cache-invalidate') && !req.originalUrl.startsWith('/kentico-icons.min.css') && !req.originalUrl.startsWith('/form')) {
    await handleCache.evaluateCommon(res, ['platformsConfig', 'urlMap', 'footer', 'UIMessages', 'home']);
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
    maxAge: 300
  };
  return res.json(cache.get(`urlMap_${res.locals.projectid}`));
}));

// API Reference
const prerender = () => {
  const yaml = 'https://gist.githubusercontent.com/jancerman/248759d3ae8b088dee38c983adca949f/raw/8ac4355e098ae5f38d3e581f91524bd563426a32/OHP%20OAS%20Proto.yaml';
  const options = prerenderOptions.join(' ');
  const template = './views/apiReference/redoc/template.hbs';

  cmd.get(
      `node ./helpers/redoc-cli/index.js bundle ${yaml} -t ${template} ${options}`,
      function(err, data, stderr) {
          console.log(data);
          console.log(err);
          console.log(stderr);
      }
  );
};

prerender();

app.use('/api-reference', apiReference);
// End of API Reference

app.use('/', tutorials);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  return next(err);
});

// error handler
app.use(async(err, req, res, _next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  console.error(err.stack);
  if (appInsights && appInsights.defaultClient) {
    appInsights.defaultClient.trackTrace({ message: 'ERR_STACK_TRACE: ' + err.stack });
  }
  // render the error page
  res.status(err.status || 500);
  req.err = err;
  await handleCache.evaluateCommon(res, ['not_found']);
  return error(req, res);
});

module.exports = app;
