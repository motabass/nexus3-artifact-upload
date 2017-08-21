const gulp = require('gulp');
const babel = require('gulp-babel');
const inline = require('gulp-inline');
const del = require('del');
const eslint = require('gulp-eslint');
const runSequence = require('run-sequence');

gulp.task('babel', () => {
  return gulp.src('index.js').pipe(babel({
    presets: ['env']
  })).pipe(gulp.dest('dist'))
});

gulp.task('inline', () => {
  return gulp.src('dist/index.html').pipe(inline({
    base: ''
  })).pipe(gulp.dest('dist'));
});

gulp.task('copy-html', () => {
    return gulp.src('index.html').pipe(gulp.dest('dist'))
  }
);

gulp.task('copy-css', () => {
    return gulp.src('style.css').pipe(gulp.dest('dist'))
  }
);

gulp.task('lint', () => {
  // ESLint ignores files with "node_modules" paths.
  // So, it's best to have gulp ignore the directory as well.
  // Also, Be sure to return the stream from the task;
  // Otherwise, the task may end before the stream has finished.
  return gulp.src(['index.js'])
              // eslint() attaches the lint output to the "eslint" property
              // of the file object so it can be used by other modules.
              .pipe(eslint())
              // eslint.format() outputs the lint results to the console.
              // Alternatively use eslint.formatEach() (see Docs).
              .pipe(eslint.format())
              // To have the process exit with an error code (1) on
              // lint error, return the stream and pipe to failAfterError last.
              .pipe(eslint.failAfterError());
});

gulp.task('clean', () => {
  return del([
    'dist/*.js',
    'dist/*.css',
  ]);
});

gulp.task('default', function (callback) {
  runSequence('lint', 'copy-html', 'copy-css', 'babel', 'inline', 'clean', callback);
});

