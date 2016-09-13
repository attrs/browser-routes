var xrouter = require('x-router');
var xroutermodal = require('x-router-modal');

xrouter()
  .set('view target', '#page')
  .set('views', '/partials/')
  .use(xroutermodal())
  .use(function(req, res, next) {
    res.render('header.html', '#header');
    res.render('footer.html', '#footer');
    next();
  })
  .get('/', function(req, res, next) {
    res.render('page.html');
  })
  .get('/pagec', function(req, res, next) {
    res.modal('article.html', function(err, target) {
      if( err ) return next(err);
      target.querySelector('#value').innerHTML = 'Page C !!';
    });
  })
  .use('/:id', xrouter.Router()
    .get('/', function(req, res, next) {
      res.render('article.html', function(err, target) {
        if( err ) return next(err);
        target.querySelector('#value').innerHTML = 'Page ' + req.params.id + '';
      });
    })
  )
  .on('error', function(e) {
    console.error('error', e.detail.error);
  })
  .on('notfound', function(e) {
    console.error('notfound', e.detail.href);
  });