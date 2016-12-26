var xrouter = require('x-router');

var subapp = xrouter('subapp')
.use(function(req, res, next) {
  console.log('subapp', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
  next();
})
.get('/', function(req, res, next) {
  console.log('subapp./', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
  next();
})
.get('/:d', function(req, res, next) {
  console.log('subapp.d', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
  next();
});

var subrouter = xrouter.Router('subrouter')
.use(function(req, res, next) {
  console.log('subrouter', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
  next();
})
.get('/', function(req, res, next) {
  console.log('subrouter./', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
  next();
})
.get('/:d', function(req, res, next) {
  console.log('subrouter.d', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
  next();
});

var app = xrouter('app')
.use(function(req, res, next) {
  res.config('key', 'value');
  console.info('start', req, res.config('key'));
  
  res.render.html('Hello!', '#page');
  next();
})
.get('/:a', function(req, res, next) {
  console.log('root.a', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
  next();
})
.use('/:a', 
  xrouter.Router('sub')
  .use(function(req, res, next) {
    console.log('sub', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
    next();
  })
  .get('/', function(req, res, next) {
    console.log('sub./', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
    next();
  })
  .get('/:b', function(req, res, next) {
    console.log('sub.b', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
    next();
  })
  .use('/:b', 
    xrouter.Router('sub2')
    .use(function(req, res, next) {
      console.log('sub2', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
      next();
    })
    .get('/', 'test/list?b=2')
    .get('/:c', function(req, res, next) {
      console.log('sub2.c', req.app.id, req.href, req.url, req.parentURL || '(empty)', req.params);
      next();
    })
    .use('/:c', subapp)
    .use('/:c', subrouter)
  )
)
.listen();