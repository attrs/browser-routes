var router = require('x-router');
var angularengine = require('x-router-angular');
var angular = require('angular');

angular.app('app', [])
.controller('article', ['$scope', 'ensure', function(scope) {
  scope.setValue = function(value) {
    scope.value = value;
  };
});

router()
  .engine('angular', angularengine())
  .set('view engine', 'angular')
  .set('view target', '#page')
  .set('views', '/partials/')
  .use(function(req, res, next) {
    res.render('header.html', '#header');
    res.render('footer.html', '#footer');
    next();
  })
  .get('/', function(req, res, next) {
    res.render('page.html');
  })
  .get('/pagec', function(req, res, next) {
    res.render('article.html', function(err, target, scopes) {
      if( err ) return next(err);
      scopes['article'].setValue('Success! Page C !!');
    });
  })
  .use('/:id', router.Router()
    .get('/', function(req, res, next) {
      res.render('article.html', function(err, target, scopes) {
        if( err ) return next(err);
        scopes['article'].setValue('Success! This page is "' + req.params.id + '"');
      });
    })
  )
  .on('error', function(e) {
    console.error('error', e.detail.error);
  })
  .on('notfound', function(e) {
    console.error('notfound', e.detail.href);
  });