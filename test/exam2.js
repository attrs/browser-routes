var app = xrouter()
  .config('view target', '#target1')  // default render target
  .config('views', '/')
  .use(function(req, res, next) {
    console.log('hello');
    next();
  })
  .get('/', function(req, res, next) {
    res.render.html('Hello!');
  })
  .use('/sub', xrouter.Router()
     .use(function(req, res, next) {
       console.log('sub routing...');
       res.set('view target', '#target2');
       next();
     })
     .get('/', 'index')  // redirect to `index`
     .get('/index', function(req, res, next) {
       res.render.html('sub index!',  {
         target: '#target3'
       }).end();
     })
     .get('/some', function(req, res, next) {
       res.end();
     })
     .get('/:value', function(req, res, next) {
       var value = req.params.value;
       
       res.render.html('parameter is ' + value, function(err, target) {
         if( err ) return next(err);
         console.log('render target is ', target);
       }).end();
     })
  )
  .on('end', function(e) {
    console.debug('end', e.detail.href);
  })
  .on('writestate', function(e) {
    console.debug('writestate', e.detail);
  })
  .on('notfound', function(e) {
    console.warn('notfound', e.detail.href);
  })
  .on('error', function(e) {
    console.error('error', e.detail.error);
  })
  .listen();

