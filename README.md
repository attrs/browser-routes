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
var router = require('x-router');
router().use(...);
```


## Usage
### Define Routing
```javascript
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
      .get('/:c', function(req, res, next) {
        console.log('3', req.url, req.parentURL, req.params);
        next();
      })
      .use('/:b', Router.router()
        .get('/:d', function(req, res, next) {
          console.log('4', req.url, req.parentURL, req.params);
          next();
        })
      )
    )
  );
```

### In HTML
> use `route` attribute or `javascript:route(...)`

```html
<a href="/a/b/c/d/e" route>/a/b/c/d/e</a>
<a href="javascript:routes('/a/b/c/d');">route('/a/b/c/d')</a>
```



### License
Licensed under the MIT License.
See [LICENSE](./LICENSE) for the full license text.
