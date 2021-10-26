const handleCache = require('./handleCache');
const commonContent = require('./commonContent');
const getUrlMap = require('./urlMap');

// URLs allowed in the application
const urlWhitelist = [
  '/other/*',
  '/form/*',
  '/urlmap',
  '/favicon.ico',
  '/rss/*',
  '/redirect-urls',
  '/cache-invalidate',
  '/service-check/*',
  '/robots.txt',
  '/link-to',
  '/sitemap.xml',
  '/pdf',
  '/login',
  '/signup',
  '/logout',
  '/callback',
  '/opensearch.xml'
];

const appHelper = {
  pageExists: async (req, res) => {
    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
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
  },
  handleKCKeys: (req, res) => {
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
  },
  getProjectLanguage: async (res) => {
    const languages = await commonContent.getLanguages(res);
    if (languages.length) {
      res.locals.language = languages[0].system.codename;
    } else {
      res.locals.language = 'default';
    }
  }
};

module.exports = appHelper;
