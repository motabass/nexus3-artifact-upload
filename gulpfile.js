const gulp = require('gulp');
const babel = require('gulp-babel');
const inline = require('gulp-inline');
const del = require('del');
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

gulp.task('copy', () => {
    return gulp.src('index.html').pipe(gulp.dest('dist'))
  }
);

gulp.task('clean', () => {
  return del([
    'dist/index.js'
  ]);
});

gulp.task('default', function (callback) {
  runSequence('copy', 'babel', 'inline', 'clean', callback);
});

