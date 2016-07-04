var routes = require('browser-routes');

routes
  .use(function(req, res, next) {
    console.log('1', req.url, req.parentUrl, req.params);
    next();
  })
  .use('/:a', function(req, res, next) {
    console.log('2', req.url, req.parentUrl, req.params);
    next();
  })
  .use('/:a', routes.router()
    .use('/:b', routes.router()
      .use('/:c', function(req, res, next) {
        console.log('3', req.url, req.parentUrl, req.params);
        next();
      })
      .use('/:b', routes.router()
        .use('/:d', function(req, res, next) {
          console.log('4', req.url, req.parentUrl, req.params);
          next();
        })
      )
    )
    .use('/:b', function(req, res, next) {
      console.log('5', req.url, req.parentUrl, req.params);
      next();
    })
    .get('/:b/:c', function(req, res, next) {
      console.log('6', req.url, req.parentUrl, req.params);
      next();
    })
    .get('/:b', function(req, res, next) {
      console.log('7', req.url, req.parentUrl, req.params);
      next();
    })
  )
  .on('error', function(e) {
    console.error('routes error', e.detail);
  })
  .on('notfound', function(e) {
    console.error('routes notfound', e.detail.url);
  });

