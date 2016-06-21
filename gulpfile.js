'use strict';

const path = require('path');
const gulp = require('gulp');
const gutil = require('gulp-util');
const rename = require("gulp-rename");
const uglify = require('gulp-uglify');
const rimraf = require('gulp-rimraf');
const webpack = require('webpack-stream');

const dist = path.join(__dirname, 'dist');

gulp.task('build.js.clean', () => {
  return gulp.src('dist', { read: false })
    .pipe(rimraf());
});

gulp.task('build.webpack', ['build.js.clean'], () => {
  var conf = require('./webpack.config.js');
  delete conf.output.path;
  
  return gulp.src('routes.js')
    .pipe(webpack(conf))
    .pipe(gulp.dest(dist));
});

gulp.task('build', ['build.webpack'], () => {
  return gulp.src(path.join(dist, 'routes.js'))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest(dist));
});

// conclusion
gulp.task('watch', ['build.watch']);
gulp.task('default', ['build']);
