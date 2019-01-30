require('dotenv').config();
const appInsights = require('applicationinsights');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const logger = require('morgan');
const asyncHandler = require('express-async-handler');

const getUrlMap = require('./helpers/urlMap');

const home = require('./routes/home');
const tutorials = require('./routes/tutorials');
const sitemap = require('./routes/sitemap');
const robots = require('./routes/robots');

const app = express();

// Azure Application Insights monitors
if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights.setup();
  appInsights.start();
}

app.locals.deployVersion = (new Date).getTime();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 86400000
}));

//Routes
app.get('*', (req, res, next) => {
  res.locals.projectid = typeof req.query.projectid !== 'undefined' ? req.query.projectid : process.env['KC.ProjectId'];
  res.locals.previewapikey = typeof req.query.previewapikey !== 'undefined' ? req.query.previewapikey : process.env['KC.PreviewApiKey'];
  return next();
});

app.use('/', home);
app.use('/tutorials', tutorials);

app.use('/sitemap.xml', sitemap);
app.use('/robots.txt', robots);

app.get('/urlmap', asyncHandler(async (req, res, next) => {
  const urlMap = await getUrlMap({
    projectid: res.locals.projectid,
    previewapikey: res.locals.previewapikey 
  });
  return res.json(urlMap);
}));

app.use('/test', (req, res, next) => {
  return res.send(`${process.env.APPINSIGHTS_INSTRUMENTATIONKEY}, ${process.env['KC.ProjectId']}, ${process.env['KC.PreviewApiKey']}`);
});

app.get('/design/home', (req, res, next) => {
  return res.render('design/home', {
    title: 'Home',
    req: req
  });
});

app.get('/design/article', (req, res, next) => {
  return res.render('design/article', {
    title: 'Article',
    req: req
  });
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, _next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  console.error(err.stack);
  // render the error page
  res.status(err.status || 500);
  res.render('pages/error', { 
    req: req,
    navigation: [] 
  });
});

module.exports = app;