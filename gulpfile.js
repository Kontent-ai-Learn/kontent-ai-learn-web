const gulp = require('gulp');
const nodemon = require('gulp-nodemon');
const uglifyes = require('uglify-es');
const composer = require('gulp-uglify/composer');
const uglify = composer(uglifyes, console);
const babel = require('gulp-babel');
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const less = require('gulp-less');
const LessAutoprefix = require('less-plugin-autoprefix');
const autoprefix = new LessAutoprefix({
  browsers: ['last 2 versions']
});
const cleanCSS = require('gulp-clean-css');
const replace = require('gulp-replace');
const browserSync = require('browser-sync').create();
const axios = require('axios');
const axiosRetry = require('axios-retry');
const localUrl = 'http://localhost:3000';
let nodemonStarted = false;
const browserSyncPort = 3099;

axiosRetry(axios, {
  retries: 20,
  retryDelay: () => 500
});

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
  'node_modules/prismjs/plugins/autolinker/prism-autolinker.min.js',
  'node_modules/prismjs/plugins/file-highlight/prism-file-highlight.js',
];

gulp.task('js-app', () => {
  return gulp.src([
      'public/learn/js/src/app/polyfills.js',
      'public/learn/js/src/app/helper.js',
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
      'public/learn/js/src/app/helper-form.js',
      'public/learn/js/src/app/form-labels.js',
      'public/learn/js/src/app/form-feedback.js',
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
      'node_modules/@auth0/auth0-spa-js/dist/auth0-spa-js.production.js',
      'public/learn/js/src/app/training-course.js',
      'public/learn/js/src/app/auth0.js',
      'node_modules/@splidejs/splide/dist/js/splide.js',
      'public/learn/js/src/app/carousel.js',
      'public/learn/js/src/app/survey.js',
    ])
    .pipe(concat('app.js'))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/learn/js'))
});

gulp.task('js-reference', () => {
  return gulp.src([
      'public/learn/js/src/app/polyfills.js',
      'public/learn/js/src/app/helper.js',
      'public/learn/js/src/app/dpr.js',
      'public/learn/js/src/app/data-toggle.js',
      'public/learn/js/src/app/intercom.js',
      ...prismFiles,
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
    ])
    .pipe(concat('apireference.js'))
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/learn/js'))
});

gulp.task('js-changelog', () => {
  return gulp.src([
      'node_modules/mixitup/dist/mixitup.min.js',
      'public/learn/js/src/filter/mixitup/mixitup-multifilter.js',
      'public/learn/js/src/filter/mixitup/mixitup-pagination.js',
      'public/learn/js/src/filter/helper-filter.js',
      'public/learn/js/src/filter/filter-changelog.js'
    ])
    .pipe(concat('changelog.js'))
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/learn/js'))
});

gulp.task('js-elearning', () => {
  return gulp.src([
      'node_modules/mixitup/dist/mixitup.min.js',
      'public/learn/js/src/filter/helper-filter.js',
      'public/learn/js/src/filter/filter-elearning.js'
    ])
    .pipe(concat('elearning.js'))
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/learn/js'))
});

gulp.task('js-service-check', () => {
  return gulp.src([
      'node_modules/@auth0/auth0-spa-js/dist/auth0-spa-js.production.js',
      'public/learn/js/src/service-check/service-check.js'
    ])
    .pipe(concat('service-check.js'))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/learn/js'))
});

gulp.task('js-algolia', () => {
  return gulp.src([
      'node_modules/algoliasearch/dist/algoliasearch-lite.umd.js',
      'node_modules/instantsearch.js/dist/instantsearch.production.min.js'
    ])
    .pipe(concat('algolia.js'))
    .pipe(replace('//# sourceMappingURL=instantsearch.production.min.js.map', ''))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/learn/js'))
});

gulp.task('js-search-insights', () => {
  return gulp.src([
      'node_modules/search-insights/dist/search-insights.min.js'
    ])
    .pipe(concat('search-insights.js'))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/learn/js'))
});

gulp.task('js-kontentsmartlink', () => {
  return gulp.src([
      'node_modules/@kentico/kontent-smart-link/dist/kontent-smart-link.umd.js'
    ])
    .pipe(concat('kontentsmartlink.js'))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/learn/js'))
});

gulp.task('css-app', () => {
  return gulp.src([
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
      'public/learn/css/src/components/feedback-form.less',
      'public/learn/css/src/components/form.less',
      'public/learn/css/src/components/infobar.less',
      'public/learn/css/src/components/filter.less',
      'public/learn/css/src/components/icon.less',
      'public/learn/css/src/components/preview-warning.less',
      'public/learn/css/src/components/display-mode.less',
      'public/learn/css/src/components/aside.less',
      'public/learn/css/src/components/mixitup.less',
      'public/learn/css/src/components/items-to-show.less',
      'public/learn/css/src/components/edit-link.less',
      'public/learn/css/src/components/autocomplete.less',
      'public/learn/css/src/components/video-controls.less',
      'public/learn/css/src/components/quote.less',
      'public/learn/css/src/general/print.less',
      'node_modules/@splidejs/splide/dist/css/splide-core.min.css',
      'public/learn/css/src/components/carousel.less',
      'public/learn/css/src/components/survey.less',
      'public/learn/css/src/components/question.less',
      'public/learn/css/src/components/answer.less',
    ])
    .pipe(concat('app.less'))
    .pipe(less({
      plugins: [autoprefix]
    }))
    .pipe(cleanCSS())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('./public/learn/css'));
});

gulp.task('css-reference', () => {
  return gulp.src([
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
      'public/learn/css/src/components/autocomplete.less',
      'public/learn/css/src/components/video-controls.less',
      'public/learn/css/src/general/print.less'
    ])
    .pipe(concat('apireference.less'))
    .pipe(less({
      plugins: [autoprefix]
    }))
    .pipe(cleanCSS())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('./public/learn/css'));
});

gulp.task('css-service-check', () => {
  return gulp.src([
      'public/learn/css/src/general/service-check.less',
    ])
    .pipe(concat('service-check.less'))
    .pipe(less({
      plugins: [autoprefix]
    }))
    .pipe(cleanCSS())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('./public/learn/css'));
});

gulp.task('css-kontentsmartlink', () => {
  return gulp.src([
      'node_modules/@kentico/kontent-smart-link/dist/kontent-smart-link.styles.css'
    ])
    .pipe(concat('kontentsmartlink.less'))
    .pipe(less({
      plugins: [autoprefix]
    }))
    .pipe(cleanCSS())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('./public/learn/css'));
});

gulp.task('reload', (done) => {
  browserSync.reload();
  done();
});

gulp.task('build-js-app', gulp.parallel(['js-app', 'js-reference']));
gulp.task('build-js-filer', gulp.parallel(['js-changelog', 'js-elearning']));
gulp.task('build-css', gulp.parallel(['css-app', 'css-reference', 'css-service-check']));

gulp.task('watch', (done) => {
  gulp.watch('public/learn/js/src/app/*.js', gulp.series(['build-js-app', 'reload']));
  gulp.watch('public/learn/js/src/filter/*.js', gulp.series(['build-js-filer', 'reload']));
  gulp.watch('public/learn/js/src/service-check/*.js', gulp.series(['js-service-check', 'reload']));
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
          .catch(() => {
            console.log(`Error:  Unable to request ${localUrl} to be able to attach browser-sync.`);
          });
      }
  })
});

gulp.task('build', gulp.parallel(['js-app', 'js-reference', 'js-changelog', 'js-elearning', 'js-algolia', 'js-search-insights', 'js-kontentsmartlink', 'js-service-check', 'css-app', 'css-reference', 'css-kontentsmartlink', 'css-service-check']));

gulp.task('develop', gulp.series(['build', 'observe']));

gulp.task('default', gulp.series(['develop']));
