const gulp = require('gulp');
const nodemon = require('gulp-nodemon');
const uglify = require('gulp-uglify-es').default;
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const less = require('gulp-less');
const LessAutoprefix = require('less-plugin-autoprefix');
const autoprefix = new LessAutoprefix({
  browsers: ['last 2 versions']
});
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const replace = require('gulp-replace');
const browserSync = require('browser-sync').create();
const axios = require('axios');
const axiosRetry = require('axios-retry');
const localUrl = 'http://localhost:3000';
let nodemonStarted = false;
const browserSyncPort = 3099;

axiosRetry(axios, {
  retries: 20,
  retryDelay: () => 1500,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error)
      || error.code === 'ECONNABORTED'
      || error.code === 'ECONNREFUSED';
  }
});

// Javascript processing

const prismFiles = [
  'node_modules/prismjs/components/prism-core.js',
  'node_modules/prismjs/components/prism-clike.js',
  'node_modules/prismjs/components/prism-javascript.js',
  'node_modules/prismjs/components/prism-java.js',
  'node_modules/prismjs/components/prism-csharp.js',
  'node_modules/prismjs/components/prism-markup-templating.js',
  'node_modules/prismjs/components/prism-php.js',
  'node_modules/prismjs/components/prism-ruby.js',
  'node_modules/prismjs/components/prism-swift.js',
  'node_modules/prismjs/components/prism-rest.js',
  'node_modules/prismjs/components/prism-typescript.js',
  'node_modules/prismjs/components/prism-graphql.js',
  'node_modules/prismjs/plugins/line-numbers/prism-line-numbers.min.js',
  'node_modules/prismjs/plugins/autolinker/prism-autolinker.js',
  'public/learn/js/src/app/prism-autolinker-customized.js',
  'node_modules/prismjs/plugins/file-highlight/prism-file-highlight.js',
];

const processJs = (config, isProduction) => {
  if (isProduction) {
    return gulp.src(config.src)
    .pipe(concat(config.fileName))
    .pipe(replace('//# sourceMappingURL=instantsearch.production.min.js.map', ''))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/learn/js'))
  }
  return gulp.src(config.src)
  .pipe(sourcemaps.init())
    .pipe(concat(config.fileName))
    .pipe(replace('//# sourceMappingURL=instantsearch.production.min.js.map', ''))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
  .pipe(sourcemaps.write('sourcemaps'))
  .pipe(gulp.dest('public/learn/js'))
};

const jsTasks = [{
  name: 'js-app',
  config: {
    src: [
      'public/learn/js/src/app/polyfills.js',
      'public/learn/js/src/app/helper.js',
      'public/learn/js/src/app/landing-page/api.js',
      'public/learn/js/src/app/survey.js',
      'public/learn/js/src/app/certification-test.js',
      'public/learn/js/src/app/certification-test-results.js',
      'node_modules/@auth0/auth0-spa-js/dist/auth0-spa-js.production.js',
      'public/learn/js/src/app/auth0.js',
      'public/learn/js/src/app/dpr.js',
      'public/learn/js/src/app/items-to-show.js',
      'public/learn/js/src/app/data-toggle.js',
      'public/learn/js/src/app/sub-navigation.js',
      'public/learn/js/src/app/language-selector.js',
      'public/learn/js/src/app/tables.js',
      ...prismFiles,
      'public/learn/js/src/app/lazy-load.js',
      'public/learn/js/src/app/table-of-contents.js',
      'public/learn/js/src/app/gtag-events.js',
      'public/learn/js/src/app/intercom.js',
      'public/learn/js/src/app/feedback.js',
      'public/learn/js/src/app/changelog.js',
      'public/learn/js/src/app/form-labels.js',
      'public/learn/js/src/app/form.js',
      'public/learn/js/src/app/preview-warning.js',
      'public/learn/js/src/app/icon-tooltip.js',
      'public/learn/js/src/app/button.js',
      'public/learn/js/src/app/code-sample.js',
      'public/learn/js/src/app/terminology.js',
      'public/learn/js/src/app/display-mode.js',
      'public/learn/js/src/app/aside.js',
      'public/learn/js/src/app/pdf.js',
      'public/learn/js/src/app/instantsearch.js',
      'public/learn/js/src/app/multitech-articles.js',
      'public/learn/js/src/app/video.js',
      'node_modules/basiclightbox/dist/basicLightbox.min.js',
      'public/learn/js/src/app/lightbox.js',
      'public/learn/js/src/app/kontent-smart-link.js',
      'public/learn/js/src/app/trigger-on-url-map.js',
      'public/learn/js/src/app/scrollto.js',
      'node_modules/@splidejs/splide/dist/js/splide.js',
      'public/learn/js/src/app/landing-page/sliders.js',
      'public/learn/js/src/app/carousel.js',
      'public/learn/js/src/app/note-link.js',
    ],
    fileName: 'app.js'
  }
}, {
  name: 'js-reference',
  config: {
    src: [
      'public/learn/js/src/app/polyfills.js',
      'public/learn/js/src/app/helper.js',
      'public/learn/js/src/app/dpr.js',
      'public/learn/js/src/app/data-toggle.js',
      'public/learn/js/src/app/intercom.js',
      ...prismFiles,
      'node_modules/@auth0/auth0-spa-js/dist/auth0-spa-js.production.js',
      'public/learn/js/src/app/auth0.js',
      'public/learn/js/src/app/preview-warning.js',
      'public/learn/js/src/app/icon-tooltip.js',
      'public/learn/js/src/app/api-reference.js',
      'public/learn/js/src/app/button.js',
      'public/learn/js/src/app/code-sample.js',
      'public/learn/js/src/app/instantsearch.js',
      'public/learn/js/src/app/video.js',
      'node_modules/basiclightbox/dist/basicLightbox.min.js',
      'public/learn/js/src/app/lightbox.js',
      'public/learn/js/src/app/kontent-smart-link.js',
      'public/learn/js/src/app/trigger-on-url-map.js'
    ],
    fileName: 'apireference.js'
  }
}, {
  name: 'js-changelog',
  config: {
    src: [
      'node_modules/mixitup/dist/mixitup.min.js',
      'public/learn/js/src/filter/mixitup/mixitup-multifilter.js',
      'public/learn/js/src/filter/mixitup/mixitup-pagination.js',
      'public/learn/js/src/filter/helper-filter.js',
      'public/learn/js/src/filter/filter-changelog.js',
      'public/learn/js/src/filter/common.js'
    ],
    fileName: 'changelog.js'
  }
}, {
  name: 'js-landing-page',
  config: {
    src: [
      'node_modules/mixitup/dist/mixitup.min.js',
      'public/learn/js/src/filter/mixitup/mixitup-multifilter.js',
      'public/learn/js/src/filter/filter-landing-page.js',
      'public/learn/js/src/filter/common.js'
    ],
    fileName: 'landing-page.js'
  }
}, {
  name: 'js-service',
  config: {
    src: [
      'node_modules/@auth0/auth0-spa-js/dist/auth0-spa-js.production.js',
      'public/learn/js/src/app/helper.js',
      'public/learn/js/src/service/redirects.js',
      'public/learn/js/src/service/cacheKeys.js',
      'public/learn/js/src/service/check.js',
      'public/learn/js/src/service/service.js'
    ],
    fileName: 'service.js'
  }
}, {
  name: 'js-algolia',
  config: {
    src: [
      'node_modules/algoliasearch/dist/algoliasearch-lite.umd.js',
      'node_modules/instantsearch.js/dist/instantsearch.production.min.js'
    ],
    fileName: 'algolia.js'
  }
}, {
  name: 'js-search-insights',
  config: {
    src: [
      'node_modules/search-insights/dist/search-insights.min.js'
    ],
    fileName: 'search-insights.js'
  }
}, {
  name: 'js-kontentsmartlink',
  config: {
    src: [
      'node_modules/@kentico/kontent-smart-link/dist/kontent-smart-link.umd.js'
    ],
    fileName: 'kontentsmartlink.js'
  }
}];

jsTasks.forEach((item) => {
  gulp.task(item.name, () => processJs(item.config, false));
  gulp.task(`${item.name}-production`, () => processJs(item.config, true));
});

// CSS processing

const processCss = (config, isProduction) => {
  if (isProduction) {
    return gulp.src(config.src)
    .pipe(concat(config.fileName))
    .pipe(less({
      plugins: [autoprefix]
    }))
    .pipe(cleanCSS())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('./public/learn/css'));
  }
  return gulp.src(config.src)
  .pipe(sourcemaps.init())
    .pipe(concat(config.fileName))
    .pipe(less({
      plugins: [autoprefix]
    }))
    .pipe(cleanCSS())
    .pipe(rename({
      suffix: '.min'
    }))
  .pipe(sourcemaps.write('sourcemaps'))
  .pipe(gulp.dest('./public/learn/css'));
};

const cssTasks = [{
  name: 'css-app',
  config: {
    src: [
      'public/learn/css/src/general/reset.less',
      'public/learn/css/src/general/fonts.less',
      'public/learn/css/src/general/kentico-icons.less',
      'public/learn/css/src/general/utilities.less',
      'public/learn/css/src/components/navigation.less',
      'public/learn/css/src/components/footer.less',
      'public/learn/css/src/components/data-toggle.less',
      'public/learn/css/src/components/sub-navigation.less',
      'public/learn/css/src/components/article.less',
      'public/learn/css/src/components/basic-lightbox.less',
      'public/learn/css/src/components/term-tooltip.less',
      'public/learn/css/src/components/callout.less',
      'public/learn/css/src/components/embed.less',
      'public/learn/css/src/components/table.less',
      'public/learn/css/src/components/table-of-contents.less',
      'public/learn/css/src/components/language-selector.less',
      'public/learn/css/src/components/code-samples.less',
      'public/learn/css/src/components/anchor-copy.less',
      'public/learn/css/src/components/prism.less',
      'public/learn/css/src/components/suggestion.less',
      'public/learn/css/src/components/hero.less',
      'public/learn/css/src/components/presentation.less',
      'public/learn/css/src/components/selection.less',
      'public/learn/css/src/components/cta.less',
      'public/learn/css/src/components/button.less',
      'public/learn/css/src/components/feedback.less',
      'public/learn/css/src/components/lightbox-form.less',
      'public/learn/css/src/components/form.less',
      'public/learn/css/src/components/infobar.less',
      'public/learn/css/src/components/filter.less',
      'public/learn/css/src/components/icon.less',
      'public/learn/css/src/components/preview-warning.less',
      'public/learn/css/src/components/info-line.less',
      'public/learn/css/src/components/display-mode.less',
      'public/learn/css/src/components/aside.less',
      'public/learn/css/src/components/mixitup.less',
      'public/learn/css/src/components/items-to-show.less',
      'public/learn/css/src/components/edit-link.less',
      'public/learn/css/src/components/autocomplete.less',
      'public/learn/css/src/components/video-controls.less',
      'public/learn/css/src/components/quote.less',
      'node_modules/@splidejs/splide/dist/css/splide-core.min.css',
      'public/learn/css/src/components/carousel.less',
      'public/learn/css/src/components/survey.less',
      'public/learn/css/src/components/certification-test.less',
      'public/learn/css/src/components/question.less',
      'public/learn/css/src/components/answer.less',
      'public/learn/css/src/components/landing-page.less',
      'public/learn/css/src/components/tile.less',
      'public/learn/css/src/components/card.less',
      'public/learn/css/src/components/dropdown.less',
      'public/learn/css/src/components/filter-search.less',
      'public/learn/css/src/components/toc.less',
      'public/learn/css/src/general/print.less',
    ],
    fileName: 'app.less'
  }
}, {
  name: 'css-reference',
  config: {
    src: [
      'public/learn/css/src/general/reset.less',
      'public/learn/css/src/general/fonts.less',
      'public/learn/css/src/general/kentico-icons.less',
      'public/learn/css/src/general/utilities.less',
      'public/learn/css/src/components/footer.less',
      'public/learn/css/src/components/data-toggle.less',
      'public/learn/css/src/components/api-reference.less',
      'public/learn/css/src/components/navigation.less',
      'public/learn/css/src/components/suggestion.less',
      'public/learn/css/src/components/basic-lightbox.less',
      'public/learn/css/src/components/callout.less',
      'public/learn/css/src/components/icon.less',
      'public/learn/css/src/components/prism-reference.less',
      'public/learn/css/src/components/preview-warning.less',
      'public/learn/css/src/components/info-line.less',
      'public/learn/css/src/components/autocomplete.less',
      'public/learn/css/src/components/video-controls.less',
      'public/learn/css/src/general/print.less'
    ],
    fileName: 'apireference.less'
  }
}, {
  name: 'css-service',
  config: {
    src: [
      'public/learn/css/src/general/service-check.less',
    ],
    fileName: 'service.less'
  }
}, {
  name: 'css-kontentsmartlink',
  config: {
    src: [
      'node_modules/@kentico/kontent-smart-link/dist/kontent-smart-link.styles.css'
    ],
    fileName: 'kontentsmartlink.less'
  }
}];

cssTasks.forEach((item) => {
  gulp.task(item.name, () => processCss(item.config, false));
  gulp.task(`${item.name}-production`, () => processCss(item.config, true));
});

gulp.task('reload', (done) => {
  browserSync.reload();
  done();
});

gulp.task('build-js-app', gulp.parallel(['js-app', 'js-reference']));
gulp.task('build-js-filter', gulp.parallel(['js-changelog', 'js-landing-page']));
gulp.task('build-css', gulp.parallel(['css-app', 'css-reference', 'css-service']));

gulp.task('watch', (done) => {
  gulp.watch('public/learn/js/src/app/**/*.js', gulp.series(['build-js-app', 'reload']));
  gulp.watch('public/learn/js/src/filter/*.js', gulp.series(['build-js-filter', 'reload']));
  gulp.watch('public/learn/js/src/service/*.js', gulp.series(['js-service', 'reload']));
  gulp.watch('public/learn/css/src/**/*.less', gulp.series(['build-css', 'reload']));
  done();
});

gulp.task('browser-sync', (done) => {
  browserSync.init({
    proxy: localUrl,
    port: browserSyncPort
  });
  done();
});

gulp.task('observe', async () => {
  return nodemon({
    script: 'server.js',
    ignore: ['helpers/redoc-cli/*.json', 'public/learn/**', 'gulpfile.js']
  }).on('start', () => {
      if (!nodemonStarted) {
        nodemonStarted = true;
        console.log('\x1b[36m%s\x1b[0m', `Waiting for browser-sync to attach on port ${browserSyncPort}...`);
        axios.get(localUrl)
          .then(() => {
            return gulp.parallel(['browser-sync', 'watch'])();
          })
          .catch((error) => {
            console.log(`Error:  Unable to request ${localUrl} to be able to attach browser-sync. Code: ${error.code}`);
          });
      }
  })
});

gulp.task('build', gulp.parallel([...jsTasks.map((item) => `${item.name}-production`), ...cssTasks.map((item) => `${item.name}-production`)]));

gulp.task('develop', gulp.series([...jsTasks.map((item) => item.name), ...cssTasks.map((item) => item.name), 'observe']));

gulp.task('default', gulp.series(['develop']));
