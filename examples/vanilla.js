Router()
  .use(function(req, res, next) {
    console.log('1', req.url, req.parentURL, req.params);
    next();
  })
  .use('/:a', function(req, res, next) {
    console.log('2', req.url, req.parentURL, req.params);
    next();
  })
  .use('/:a', Router.router()
    .use('/:b', Router.router()
      .use('/:c', function(req, res, next) {
        console.log('3', req.url, req.parentURL, req.params);
        next();
      })
      .use('/:b', Router.router()
        .use('/:d', function(req, res, next) {
          console.log('4', req.url, req.parentURL, req.params);
          next();
        })
      )
    )
    .use('/:b', function(req, res, next) {
      console.log('5', req.url, req.parentURL, req.params);
      next();
    })
    .get('/:b/:c', function(req, res, next) {
      console.log('6', req.url, req.parentURL, req.params);
      next();
    })
    .get('/:b', function(req, res, next) {
      console.log('7', req.url, req.parentURL, req.params);
      next();
    })
  )
  .on('error', function(e) {
    console.error('routes error', e.detail);
  })
  .on('notfound', function(e) {
    console.error('routes notfound', e.detail.url);
  });

