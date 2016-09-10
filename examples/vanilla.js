xrouter()
  .use(function(req, res, next) {
    console.log('1', req.url, req.parentURL, req.params);
    next();
  })
  .use('/:a', function(req, res, next) {
    console.log('2', req.url, req.parentURL, req.params);
    next();
  })
  .get('/vanilla.html', function(req, res, next) {
    console.log('hello router', req.params);
  })
  .use('/:a', xrouter.Router()
    .use('/:b', xrouter.Router()
      .get('/:c', function(req, res, next) {
        console.log('3', req.url, req.parentURL, req.params);
      })
      .use('/:b', xrouter.Router()
        .get('/:d', function(req, res, next) {
          console.log('4', req.url, req.parentURL, req.params);
        })
      )
    )
    .use('/:b', function(req, res, next) {
      console.log('5', req.url, req.parentURL, req.params);
      next();
    })
    .get('/:b/:c', function(req, res, next) {
      console.log('6', req.url, req.parentURL, req.params);
    })
    .get('/:b', function(req, res, next) {
      console.log('7', req.url, req.parentURL, req.params);
    })
  )
  .on('error', function(e) {
    console.error('error', e.detail);
  })
  .on('notfound', function(e) {
    console.error('notfound', e.detail.url);
  });

