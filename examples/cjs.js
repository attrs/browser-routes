var router = require('x-router');

router()
  .use(function(req, res, next) {
    console.log('1', req.url, req.parentURL, req.params);
    next();
  })
  .use('/:a', function(req, res, next) {
    console.log('2', req.url, req.parentURL, req.params);
    next();
  })
  .use('/:a', router.Router()
    .use('/:b', router.Router()
      .use('/:c', function(req, res, next) {
        console.log('3', req.url, req.parentURL, req.params);
      })
      .use('/:b', router.Router()
        .use('/:d', function(req, res, next) {
          console.log('4', req.url, req.parentURL, req.params);
        })
      )
    )
    .use('/:b', function(req, res, next) {
      console.log('5', req.url, req.parentURL, req.params);
    })
    .get('/:b/:c', function(req, res, next) {
      console.log('6', req.url, req.parentURL, req.params);
    })
    .get('/:b', function(req, res, next) {
      console.log('7', req.url, req.parentURL, req.params);
    })
  )
  .on('error', function(e) {
    console.error('routes error', e.detail);
  });

