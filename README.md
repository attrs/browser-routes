# x-router

[![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url]

[npm-image]: https://img.shields.io/npm/v/x-router.svg?style=flat
[npm-url]: https://npmjs.org/package/x-router
[downloads-image]: https://img.shields.io/npm/dm/x-router.svg?style=flat
[downloads-url]: https://npmjs.org/package/x-router

## Installation

```sh
$ bower install x-router --save
```

```html
<script src="/bower_components/x-router/dist/x-router.min.js"></script>
<script>
  xrouter().use(...);
</script>
```

Browserify [`browserify`](https://www.npmjs.com/package/browserify), [`webpack`](https://www.npmjs.com/package/webpack), [`webmodules`](https://www.npmjs.com/package/webmodules)
```sh
$ npm install x-router --save
```

```javascript
var xrouter = require('x-router');
xrouter().use(...);
```


## Usage
```javascript
xrouter()
  .set('view target', '#page')  // default render target
  .set('views', '/')
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
  });




```

### Configuration
> support both `pushstate` and `hash`, If you have not set up any value automatically using `pushstate` or `hash`.

```html
<meta name="xrouter.mode" content="pushstate | hash | auto | none">
<meta name="xrouter.debug" content="false | true">
<meta name="xrouter.observe" content="true | false">
<meta name="xrouter.observe.delay" content="1000">
```

- `xrouter.mode` : router reaction mode, `pushstate` uses `history.pushState`, `hash` uses `url hash` & `none` does not change or reacting the `browser path bar`. `auto` or `(empty)` is automatically use `pushstate` or `hash` depending on the environment.
- `xrouter.debug` : log debug messages to console.
- `xrouter.observe` : use mutation observer when tag dynamically added to document. if browser does not support `MutationObserver`, it should be checked every 1,000ms.
- `xrouter.observe.delay` : observe delay in milliseconds. default value is 1000. (only <= ie10)

### in HTML
```html
<a href="/a/b/c/d/e" route>/a/b</a>
<a href="/a/b/c/d/e" route ghost>/a/c</a>
<a href="javascript:xrouter.href('/a/b/c/d');">xrouter.href('/a/b/c/d')</a>
```

### Middleware & View engines
- [`x-router-angular`](https://github.com/attrs/x-router-angular)
- [`x-router-modal`](https://github.com/attrs/x-router-modal)

### License
Licensed under the MIT License.
See [LICENSE](./LICENSE) for the full license text.
