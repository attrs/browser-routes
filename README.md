# browser-routes

[![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url]

[npm-image]: https://img.shields.io/npm/v/browser-routes.svg?style=flat
[npm-url]: https://npmjs.org/package/browser-routes
[downloads-image]: https://img.shields.io/npm/dm/browser-routes.svg?style=flat
[downloads-url]: https://npmjs.org/package/browser-routes

## Installation

```sh
$ bower install routes --save
```

```html
<script src="/bower_components/routes/dist/routes.min.js"></script>
<script>
  Routes.use(...);
</script>
```

### Commonjs way (browserify, webpack, webmodules)
```sh
$ npm install browser-routes --save
```

```javascript
var Routes = require('browser-routes');
Routes.use(...);
```


## Usage
### Define Routing
```javascript
Routes
  .use(function(req, res, next) {
    console.log('1', req.url, req.parentUrl, req.params);
    next();
  })
  .use('/:a', function(req, res, next) {
    console.log('2', req.url, req.parentUrl, req.params);
    next();
  })
  .use('/:a', Routes.router()
    .use('/:b', Routes.router()
      .get('/:c', function(req, res, next) {
        console.log('3', req.url, req.parentUrl, req.params);
        next();
      })
      .use('/:b', Routes.router()
        .get('/:d', function(req, res, next) {
          console.log('4', req.url, req.parentUrl, req.params);
          next();
        })
      )
    )
  );
```

### In HTML
> use `routes` attribute or `javascript:routes(...)`

```html
<a href="/a/b/c/d/e" routes>/a/b/c/d/e</a>
<a href="javascript:routes('/a/b/c/d');">routes('/a/b/c/d')</a>
```



### License
Licensed under the MIT License.
See [LICENSE](./LICENSE) for the full license text.
