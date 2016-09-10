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
  Router().use(...);
</script>
```

### Commonjs way (browserify, webpack, webmodules)
```sh
$ npm install x-router --save
```

```javascript
var xrouter = require('x-router');
xrouter().use(
  router.Router()
  .use(function(req, res, next) {
    next();
  })
  .get('/', function(req, res, next) {
    console.log('hello');
  })
);
```


## Usage
### Define Routing
```javascript
xrouter()
  .use(function(req, res, next) {
    console.log('1', req.url, req.parentURL, req.params);
    next();
  })
  .use('/:a', function(req, res, next) {
    console.log('2', req.url, req.parentURL, req.params);
    next();
  })
  .get('/', function(req, res, next) {
    console.log('index');
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




```

### Configuration
> support both `pushstate` and `hash`, If you have not set up any value automatically using `pushstate`.

```html
<meta name="xrouter.mode" content="pushstate | hash">
<meta name="xrouter.debug" content="false | true">
<meta name="xrouter.observe" content="true | false">
```

### In HTML
```html
<a href="/a/b/c/d/e" route>/a/b</a>
<a href="/a/b/c/d/e" route ghost>/a/c</a>
<a href="javascript:xrouter.href('/a/b/c/d');">xrouter.href('/a/b/c/d')</a>
```



### License
Licensed under the MIT License.
See [LICENSE](./LICENSE) for the full license text.
