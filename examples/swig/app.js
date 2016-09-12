var router = require('x-router');
var swigengine = require('x-router-swig');

router()
  .engine('swig', swigengine())
  .set('view engine', 'swig')
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
    res.render('article.html', {
      locals: {
        value: 'Page C !!!'
      }
    });
  })
  .use('/:id', router.Router()
    .get('/', function(req, res, next) {
      var vo = {
        value: 'Success! This page is "' + req.params.id + '"'
      };
      
      res.render('article.html', {
        locals: vo
      });
    })
  )
  .on('error', function(e) {
    console.error('error', e.detail.error);
  })
  .on('notfound', function(e) {
    console.error('notfound', e.detail.href);
  });