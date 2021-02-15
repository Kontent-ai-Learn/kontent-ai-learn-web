const gulp = require('gulp');
const uglify = require('gulp-uglify');
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
const browserSync = require('browser-sync');

gulp.task('js-app', () => {
  return gulp.src([
      'public/js/src/app/polyfills.js',
      'public/js/src/app/helper.js',
      'public/js/src/app/dpr.js',
      'public/js/src/app/items-to-show.js',
      'public/js/src/app/data-toggle.js',
      'public/js/src/app/sub-navigation.js',
      'public/js/src/app/language-selector.js',
      'node_modules/basiclightbox/dist/basicLightbox.min.js',
      'public/js/src/app/lightbox.js',
      'public/js/src/app/tables.js',
      'node_modules/prismjs/prism.js',
      'node_modules/prismjs/plugins/line-numbers/prism-line-numbers.min.js',
      'node_modules/prismjs/plugins/autolinker/prism-autolinker.min.js',
      'public/js/src/app/lazy-load.js',
      'public/js/src/app/table-of-contents.js',
      'public/js/src/app/gtag-events.js',
      'public/js/src/app/intercom.js',
      'public/js/src/app/feedback.js',
      'public/js/src/app/helper-form.js',
      'public/js/src/app/form-labels.js',
      'public/js/src/app/form-feedback.js',
      'public/js/src/app/cookie-bar.js',
      'public/js/src/app/preview-warning.js',
      'public/js/src/app/icon-tooltip.js',
      'public/js/src/app/button.js',
      'public/js/src/app/code-sample.js',
      'public/js/src/app/terminology.js',
      'public/js/src/app/display-mode.js',
      'public/js/src/app/aside.js',
      'public/js/src/app/pdf.js',
      'public/js/src/app/instantsearch.js',
      'public/js/src/app/multitech-articles.js',
      'public/js/src/app/kontent-smart-link.js',
      'public/js/src/app/trigger-on-url-map.js'
    ])
    .pipe(concat('app.js'))
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/js'))
});

gulp.task('js-reference', () => {
  return gulp.src([
      'public/js/src/app/polyfills.js',
      'public/js/src/app/helper.js',
      'public/js/src/app/dpr.js',
      'public/js/src/app/data-toggle.js',
      'public/js/src/app/intercom.js',
      'node_modules/basiclightbox/dist/basicLightbox.min.js',
      'public/js/src/app/lightbox.js',
      'node_modules/prismjs/prism.js',
      'node_modules/prismjs/plugins/line-numbers/prism-line-numbers.min.js',
      'public/js/src/app/preview-warning.js',
      'public/js/src/app/icon-tooltip.js',
      'public/js/src/app/api-reference.js',
      'public/js/src/app/button.js',
      'public/js/src/app/code-sample.js',
      'public/js/src/app/instantsearch.js',
      'public/js/src/app/kontent-smart-link.js',
      'public/js/src/app/trigger-on-url-map.js'
    ])
    .pipe(concat('apireference.js'))
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/js'))
});

gulp.task('js-changelog', () => {
  return gulp.src([
      'node_modules/mixitup/dist/mixitup.min.js',
      'public/js/src/filter/mixitup/mixitup-multifilter.js',
      'public/js/src/filter/mixitup/mixitup-pagination.js',
      'public/js/src/filter/helper-filter.js',
      'public/js/src/filter/filter-changelog.js'
    ])
    .pipe(concat('changelog.js'))
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/js'))
});

gulp.task('js-elearning', () => {
  return gulp.src([
      'node_modules/mixitup/dist/mixitup.min.js',
      'public/js/src/filter/helper-filter.js',
      'public/js/src/filter/filter-elearning.js'
    ])
    .pipe(concat('elearning.js'))
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/js'))
});

gulp.task('js-algolia', () => {
  return gulp.src([
      'node_modules/algoliasearch/dist/algoliasearch-lite.umd.js',
      'node_modules/instantsearch.js/dist/instantsearch.production.min.js',
      'node_modules/search-insights/dist/search-insights.min.js',
      'public/js/src/algolia/aa.js'
    ])
    .pipe(concat('algolia.js'))
    .pipe(replace('//# sourceMappingURL=instantsearch.production.min.js.map', ''))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/js'))
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
    .pipe(gulp.dest('public/js'))
});

gulp.task('css-app', () => {
  return gulp.src([
      'public/css/src/general/reset.less',
      'public/css/src/general/fonts.less',
      'public/css/src/general/icon-variables.less',
      'public/css/src/general/utilities.less',
      'public/css/src/components/navigation.less',
      'public/css/src/components/footer.less',
      'public/css/src/components/data-toggle.less',
      'public/css/src/components/sub-navigation.less',
      'public/css/src/components/article.less',
      'public/css/src/components/basic-lightbox.less',
      'public/css/src/components/term-tooltip.less',
      'public/css/src/components/callout.less',
      'public/css/src/components/embed.less',
      'public/css/src/components/table.less',
      'public/css/src/components/table-of-contents.less',
      'public/css/src/components/inline-icons.less',
      'public/css/src/components/language-selector.less',
      'public/css/src/components/code-samples.less',
      'public/css/src/components/anchor-copy.less',
      'public/css/src/components/prism.less',
      'public/css/src/components/suggestion.less',
      'public/css/src/components/hero.less',
      'public/css/src/components/presentation.less',
      'public/css/src/components/selection.less',
      'public/css/src/components/cta.less',
      'public/css/src/components/button.less',
      'public/css/src/components/feedback.less',
      'public/css/src/components/feedback-form.less',
      'public/css/src/components/form.less',
      'public/css/src/components/infobar.less',
      'public/css/src/components/filter.less',
      'public/css/src/components/icon.less',
      'public/css/src/components/cookie-bar.less',
      'public/css/src/components/preview-warning.less',
      'public/css/src/components/display-mode.less',
      'public/css/src/components/aside.less',
      'public/css/src/components/mixitup.less',
      'public/css/src/components/items-to-show.less',
      'public/css/src/components/edit-link.less',
      'public/css/src/components/autocomplete.less',
      'public/css/src/general/print.less'
    ])
    .pipe(concat('app.less'))
    .pipe(less({
      plugins: [autoprefix]
    }))
    .pipe(cleanCSS())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('./public/css'));
});

gulp.task('css-reference', () => {
  return gulp.src([
      'public/css/src/general/reset.less',
      'public/css/src/general/fonts.less',
      'public/css/src/general/icon-variables.less',
      'public/css/src/general/utilities.less',
      'public/css/src/components/footer.less',
      'public/css/src/components/data-toggle.less',
      'public/css/src/components/api-reference.less',
      'public/css/src/components/navigation.less',
      'public/css/src/components/inline-icons.less',
      'public/css/src/components/suggestion.less',
      'public/css/src/components/basic-lightbox.less',
      'public/css/src/components/callout.less',
      'public/css/src/components/icon.less',
      'public/css/src/components/prism-reference.less',
      'public/css/src/components/cookie-bar.less',
      'public/css/src/components/preview-warning.less',
      'public/css/src/components/autocomplete.less',
      'public/css/src/general/print.less'
    ])
    .pipe(concat('apireference.less'))
    .pipe(less({
      plugins: [autoprefix]
    }))
    .pipe(cleanCSS())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('./public/css'));
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
    .pipe(gulp.dest('./public/css'));
});

gulp.task('browser-sync', () => {
  browserSync.init({
    files: ['public/**/*.*'],
    proxy: 'http://localhost:3000',
    port: 3099
  });
});

gulp.task('watch', gulp.parallel(['js-app', 'js-reference', 'js-changelog', 'js-elearning', 'js-algolia', 'js-kontentsmartlink', 'css-app', 'css-reference', 'css-kontentsmartlink', 'browser-sync'], () => {
  gulp.watch('public/js/src/app/*.js', gulp.parallel(['js-app', 'js-reference']));
  gulp.watch('public/js/src/filter/*.js', gulp.parallel(['js-changelog', 'js-elearning']));
  gulp.watch('public/css/src/**/*.less', gulp.parallel(['css-app', 'css-reference']));
}));

gulp.task('default', gulp.series(['watch']));
