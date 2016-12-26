# x-router

[![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url]

[npm-image]: https://img.shields.io/npm/v/x-router.svg?style=flat
[npm-url]: https://npmjs.org/package/x-router
[downloads-image]: https://img.shields.io/npm/dm/x-router.svg?style=flat
[downloads-url]: https://npmjs.org/package/x-router

## Install
```sh
$ npm install x-router --save
```

```javascript
var xrouter = require('x-router');
var app = xrouter().use(...).listen();
```

## Usage
```javascript
xrouter()
  .config('view target', '#page')  // default render target
  .config('views', '/')
  .use(function(req, res, next) {
    console.log('hello');
    next();
  })
  .get('/', function(req, res, next) {
    res.render('/partials/index.html');
  })
  .use('/sub', xrouter.Router()
     .use(function(req, res, next) {
       console.log('sub routing...');
       next();
     })
     .get('/', 'index')  // redirect to `index`
     .get('/index', function(req, res, next) {
       res.render('/partials/sub/index.html',  {
         target: '#newtarget'
       }); 
     })
     .get('/:param', function(req, res, next) {
       var param = req.params.param;
       if( param === 'a' ) return res.redirect('index');
       // same as { target: '#newtarget' }
       res.render('/partials/sub/list.html', '#newtarget', function(err, target) {
         if( err ) return next(err);
         console.log('render target is ', target);
       });
     })
  )
  .use(function(req, res, next) {
    console.error('notfound', req.href);
  })
  .on('error', function(e) {
    console.error('error', e.detail.error);
  })
  .listen();
```

### Configuration
> support both `pushstate` and `hash`, If you have not set up any value automatically using `pushstate` or `hash`.

```html
<meta name="xrouter.mode" content="pushstate | hash | hashbang | auto | none">
<meta name="xrouter.debug" content="false | true">
<meta name="xrouter.observe" content="true | false">
<meta name="xrouter.observe.delay" content="1000">
```


### HTML
```html
<a href="/a/b/c/d/e" route>/a/b</a>
<a href="/a/b/c/d/e" route ghost>/a/c</a>
<a href="javascript:xrouter.href('/a/b/c/d');">xrouter.href('/a/b/c/d')</a>
```

### Related Project
- [`x-router-modal`](https://www.npmjs.com/package/x-router-modal)
- [`x-router-angular`](https://www.npmjs.com/package/x-router-angular)
- [`x-router-swig`](https://www.npmjs.com/package/x-router-swig)

### License
Licensed under the MIT License.
See [LICENSE](./LICENSE) for the full license text.
