var path = require('path');
var RoutePattern = require('route-pattern');

/*
(function() {
  var defined = '/hello/:planet?foo=:foo&fruit=:fruit#:section';
  var url = '/hello/earth?foo=bar&fruit=apple#chapter2';
  var pattern = RoutePattern.fromString(defined);
  var matches = pattern.matches(url);
  var params = pattern.match(url);
  
  console.log('match', matches);
  console.log(JSON.stringify(params, null, '  '));
});
*/

function normalize(url, doc) {
  if( !url || typeof url !== 'string' ) throw new TypeError('illegal url');
  var a = (doc || document).createElement('a');
  a.href = url;
  return {
    href: a.href,
    protocol: a.protocol,
    hostname: a.hostname,
    port: a.port,
    pathname: a.pathname,
    fullpath: a.pathname + (a.search ? a.search : '') + (a.hash ? a.hash : ''),
    search: a.search,
    hash: a.hash,
    host: a.host
  };
}

function config(name, alt) {
  var root = document.head.querySelector('meta[name="' + name + '"][content]');
  return (root && root.getAttribute('content')) || alt;
}

function current(mode) {
  if( mode === 'hash' ) {
    return location.hash;
  }

  return location.href;
}

function endsWith(str, word) {
  var i = str.toLowerCase().indexOf(word);
  return i > 0 && i === str.length - word.length;
}

function parseQuery(query) {
  query = query.trim();
  if( query[0] === '?' ) query = query.substring(1);
  var match,
      pl     = /\+/g,
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };
      
  var params = {};
  while (match = search.exec(query)) {
    var key = decode(match[1]);
    var value = decode(match[2]);
    if( Array.isArray(params[key]) ) params[key].push(value);
    else if( params[key] ) (params[key] = [params[key]]).push(value);
    else params[key] = value;
  }
  return params;
}

function defaultChecker() {
  var tag = document.currentScript || document._currentScript;
  return function() {
    return tag && tag.ownerDocument && tag.ownerDocument.documentElement && tag.ownerDocument.documentElement.contains(tag);
  };
}

function addEventListener(scope, type, fn, bubble) { 
  if( scope.attachEvent ) scope.attachEvent(type,fn); 
  else scope.addEventListener(type,fn,bubble);
}

function patternize(source, ignoresubdir) {
  var pettern = RoutePattern.fromString(source);
  var ap = RoutePattern.fromString(source + '/*after');
  
  return {
    match: function(url) {
      if( source === '/' ) return ignoresubdir ? true : (source === url);
      
      if( pettern.matches(url) ) {
        return pettern.match(url).namedParams;
      } else if( ignoresubdir && ap.matches(url) ) {
        var params = ap.match(url).namedParams;
        delete params.after;
        return params;
      }
      return false;
    },
    matches: function(url) {
      return pattern.matches(url) ? true : (ignoresubdir && ap.matches(url) ? true : false);
    }
  };
}

function dividepath(axis, full) {
  if( axis[0] === '/' ) axis = axis.substring(1);
  if( full[0] === '/' ) full = full.substring(1);
  if( endsWith(axis, '/') ) axis = axis.substring(0, axis.length - 1);
  if( endsWith(full, '/') ) full = full.substring(0, full.length - 1);
  if( !axis ) return {
    sub: '/' + full,
    parent: '/'
  };
  
  while(~axis.indexOf('//')) axis.split('//').join('/');
  while(~full.indexOf('//')) full.split('//').join('/');
  
  axis = axis.split('/');
  full = full.split('/');
  var sub = [], parent = [];
  
  for(var i=0; i < full.length; i++) {
    if( axis[i] && axis[i][0] !== ':' &&  full[i] !== axis[i] ) return null;
    
    if( i >= axis.length ) sub.push(full[i]);
    else parent.push(full[i]);
  }
  
  return {
    parent: '/' + parent.join('/'),
    sub: '/' + sub.join('/')
  };
}

/*
console.log('/', subpath('/', '/system/user/list'));
console.log('/system', subpath('/system', '/system/user/list'));
console.log('/system/user', subpath('/system/user', '/system/user/list'));
console.log('/system/user/list', subpath('/system/user/list', '/system/user/list'));
console.log('/:a', subpath('/:a', '/system/user/list'));
console.log('/:a/:b', subpath('/:a/:b', '/system/user/list'));
console.log('/:a/:b/:c', subpath('/:a/:b/:c', '/system/user/list'));

var p = patternize('/', true);
console.log('/a/b/c', p.match('/a/b/c'));
*/

function capture(o) {
  return JSON.parse(JSON.stringify(o));
}

function redirector(url) {
  return function redirector(req, res, next) {
    res.redirect(url);
  };
}

function mix() {
  var result = {};
  [].forEach.call(arguments, function(o) {
    if( o && typeof o === 'object' ) {
      for(var k in o ) result[k] = o[k];
    }
  });
  return result;
}


// factory Router
function Router(id) {
  id = id || 'unknwon';
  var boot = true;
  var routes = [];
  var listeners = {};
  var error;
  
  var body = function Router(req, res, onext) {
    if( !req.url || req.url[0] !== '/' ) throw new Error('illegal url: ' + req.url);
    error = null;
    onext = onext || function() {};
    
    var oParentURL = req.parentURL || '';
    var oURL = req.url;
    var oParams = req.params || {};
    var i = 0, finished = false;
    var next = function(err) {
      if( finished ) return console.error('[x-router] next function twice called.');
      finished = true;
      
      req.url = oURL;
      req.parentURL = oParentURL;
      req.params = oParams;
      
      if( err ) return body.fire('error', {
        router: body,
        url: req.url,
        request: req,
        response: res,
        error: err
      }) && onext(err);
      
      body.fire('notfound', {
        router: body,
        url: req.url,
        request: req,
        response: res
      });
      
      onext();
    };
    var forward = function(err) {
      if( err ) return next(err);
      
      var route = routes[i++];
      //console.log(route, boot);
      if( !route ) return next();
      if( !boot && route.type === 'boot' ) return forward();
      //console.log(route, boot, route.pattern, route.pattern.match(req.url));
      
      var params = route.pattern && route.pattern.match(req.url);
      if( !params ) return forward();
      
      req.boot = boot;
      req.params = oParams;
      req.parentURL = oParentURL;
      req.parentURL = req.parentURL;
      req.url = oURL;
      
      var div = dividepath(route.path || '', req.url);
      req.params = mix(oParams, params);
      
      if( route.fn.__router__ ) {
        req.url = div.sub;
        req.parentURL = path.join(oParentURL, div.parent);
        //req.parentURL = req.parentURL;
        
        /*console.log('routing', capture({
          //type: type,
          //id: route.fn.id,
          path: route.path,
          url: req.url,
          parentURL: req.parentURL,
          oParentURL: oParentURL,
          oURL: oURL
        }));*/
        
        route.fn.apply(body, [req, res, forward]);
      } else {
        route.fn.apply(body, [req, res, forward]);
      }
    };
    forward();
    
    boot = false;
  };
  
  body.id = id;
  body.__router__ = true;
  body.exists = function(url) {
    var exists = false;
    routes.forEach(function(route) {
      if( exists ) return;
      if( route.type === 'get' ) {
        var params = route.pattern.match(url);
        if( params ) exists = true;
      } else if( route.type === 'use' ) {
        exists = route.fn.exists(url.substring(route.path.length));
      }
    });
    return exists;
  };
  
  body.use = function(path, fn) {
    if( typeof path === 'function' ) fn = path, path = '/';
    if( typeof path !== 'string' ) throw new TypeError('illegal type of path:' + typeof(path));
    if( typeof fn === 'string' ) fn = redirector(fn);
    if( typeof fn !== 'function' ) throw new TypeError('illegal type of router:' + typeof(fn));
    path = path ? path.trim() : '/';
    if( path[0] !== '/' ) path = '/' + path;
    
    routes.push({
      type: 'use',
      path: path,
      pattern: patternize(path, true),
      fn: fn
    });
    return this;
  };
  
  body.get = function(path, fn) {
    if( typeof path === 'function' ) fn = path, path = '/';
    if( typeof path !== 'string' ) throw new TypeError('illegal type of path:' + typeof(path));
    if( typeof fn === 'string' ) fn = redirector(fn);
    if( typeof fn !== 'function' ) throw new TypeError('illegal type of router:' + typeof(fn));
    path = path ? path.trim() : '/';
    if( path[0] !== '/' ) path = '/' + path;
    
    routes.push({
      type: 'get',
      path: path,
      pattern: patternize(path),
      fn: fn
    });
    return this;
  };
  
  body.boot = function(path, fn) {
    if( typeof path === 'function' ) fn = path, path = '/';
    if( typeof path !== 'string' ) throw new TypeError('illegal type of path:' + typeof(path));
    if( typeof fn === 'string' ) fn = redirector(fn);
    if( typeof fn !== 'function' ) throw new TypeError('illegal type of router:' + typeof(fn));
    path = path ? path.trim() : '/';
    if( path[0] !== '/' ) path = '/' + path;
    
    routes.push({
      type: 'boot',
      path: path,
      pattern: patternize(path, true),
      fn: fn
    });
    return this;
  };
  
  body.notfound = function(fn) {
    body.on('notfound', fn);
    return this;
  };
  
  body.error = function(fn) {
    body.on('error', fn);
    return this;
  };
  
  body.drop = function(fn) {
    var dropfns = [];
    routes.forEach(function(route) {
      if( route.fn === fn ) dropfns.push(route);
    });
    
    dropfns.forEach(function(route) {
      routes.splice(routes.indexOf(route), 1);
    });
    return this;
  };
  
  body.clear = function() {
    routes = [];
    return this;
  };
  
  body.on = function(type, fn) {
    listeners[type] = listeners[type] || [];
    listeners[type].push(fn);
    return this;
  };
  
  body.once = function(type, fn) {
    var wrap = function(e) {
      body.off(type, wrap);
      return fn.call(this, e);
    };
    body.on(type, wrap);
    return this;
  };

  body.off = function(type, fn) {
    var fns = listeners[type];
    if( fns )
      for(var i;~(i = fns.indexOf(fn));) fns.splice(i, 1);
    
    return this;
  };

  body.fire = function(type, detail) {
    if( type === 'error' ) {
      error = detail.error;
      
      if( !(listeners[type] && listeners[type].length) )
        return console.error('[x-router] error', detail);
    }
    
    (listeners[type] || []).forEach(function(listener) {
      listener.call(this, {
        type: type,
        detail: detail || {}
      });
    });
  };
  
  return body;
}

// class Routes
function Routes(options) {
  if( !(this instanceof Routes) ) throw new Error('illegal state: \'new Routes()\' instead of \'Routes()\'');
  
  var self = this;
  var baseURL = '';
  var router = Router('root'), request, response, hashroutes;
  var applicationScope = {};
  var timeout;
  
  this.timeout = function(msec) {
    if( typeof msec !== 'number' ) return console.warn('illegal timeout ' + msec);
    timeout = msec;
  };
  
  this.base = function(url) {
    if( !arguments.length ) return baseURL;
    if( !url ) {
      baseURL = '';
      return this;
    }
    baseURL = path.dirname(path.resolve(url, 'index.html'));
    //console.log('baseURL', baseURL);
    return this;
  };
  
  this.router = function(name) {
    return Router(name);
  };
  
  this.normalize = function(url) {
    url = url.trim();
    if( !url ) return baseURL;
    if( url[0] === '/' ) return baseURL + url;
    return normalize(url).fullpath;
  };
  
  var exec = this.exec = function(requrl, body) {
    //console.info('exec', requrl);
    var parsed = normalize(requrl);
    var hash = parsed.hash;
    var query = parsed.search;
    var url = parsed.pathname;
    var fullpath = parsed.fullpath;
    if( request && request.requestURL && fullpath === request.requestURL ) return;
    
    //console.log('exec', baseURL, requrl, url, url.indexOf(baseURL), parsed);
    if( baseURL && url.startsWith(baseURL) ) {
      url = url.substring(baseURL.length);
    } else if( baseURL ){
      return console.error('given url is not a sub url of base url \'' + baseURL + '\'');
    }
    
    hashroutes = [];
    request = {
      referer: null,    // TODO
      method: 'get',
      parsed: parsed,
      baseURL: baseURL,
      requestURL: fullpath,
      url: url || '/',
      hashname: hash,
      query: parseQuery(query),
      params: {},
      body: body,
      app: applicationScope
    };
    
    //console.log('req', capture(request));
    
    var finished = false;
    response = {
      redirect: function(tourl, saveHistory) {
        //console.info('redirect', url, request.parentURL, request.url, request);
        finished = true;
        
        if( tourl.startsWith('#') ) {
          location.href = tourl;
        } else if( tourl.startsWith('/') ) {
          exec(path.join(baseURL, tourl));
        } else {
          exec(path.join(baseURL, request.parentURL, request.url, tourl));
        }
        
        router.fire('redirect', {
          requestURL: fullpath,
          url: url,
          request: request,
          response: response,
          saveHistory: saveHistory
        });
        
        return this;
      },
      hash: function(hash, fn) {
        hashroutes.push({hash:hash, fn:fn});
      },
      end: function() {
        if( finished ) return console.warn('[x-router] request \'' + request.requestURL + '\' already finished.');
        finished = true;
        var err = router.error;
        //if( !err ) // TODO: exec hash
        
        router.fire('finish', {
          requestURL: fullpath,
          error: err,
          url: url,
          request: request,
          response: response
        });
      }
    };
    
    if( timeout > 0 ) {
      setTimeout(function() {
        if( finished ) return;
        console.warn('[x-router] router timeout(' + timeout + ')');
        response.end();
      }, timeout);
    }
    
    router.fire('request', {
      requestURL: fullpath,
      url: url,
      request: request,
      response: response
    });
    
    router(request, response);
    return this;
  };
  
  // --- wire to router
  this.use = function(path, fn) {
    router.use.apply(router, arguments);
    return this;
  };
  
  this.boot = function(fn) {
    router.boot(fn);
    return this;
  };
  
  this.get = function(path, fn) {
    router.get(path, fn);
    return this;
  };
  
  this.notfound = function(fn) {
    router.notfound(fn);
    return this;
  };
  
  this.error = function(fn) {
    router.error(fn);
    return this;
  };
  
  this.drop = function(fn) {
    router.drop(fn);
    return this;
  };
  
  this.exists = function(path) {
    return router.exists(path);
  };
  
  this.clear = function() {
    router.clear();
    return this;
  };
  
  this.on = function(type, fn) {
    router.on(type, fn);
    return this;
  };
  
  this.once = function(type, fn) {
    router.once(type, fn);
    return this;
  };
  
  this.off = function(type, fn) {
    router.off(type, fn);
    return this;
  };
}

var routes = new Routes();
routes.Routes = Routes;
routes.Router = Router;

// instantiate main routes && trigger
(function() {
  //var always = config('routes.always') === 'true' ? true : true;
  var mode = config('routes.mode') || (history.pushState ? 'pushstate' : 'hash');
  
  if( mode === 'pushstate' ) {
    if( !history.pushState ) return console.error('[x-router] unsupported \'history.pushState\'');
    
    var _pushState = history.pushState;
    var _replaceState = history.replaceState;
    
    history.pushState = function(state, title, url) {
      _pushState.apply(history, arguments);
      routes.exec(location.href);
    };
    history.replaceState = function(state, title, url) {
      _replaceState.apply(history, arguments);
      routes.exec(location.href);
    };
    
    window.onpopstate = function(e) {
      routes.exec(location.href);
    };
    
    routes.on('request', function(e) {
      if( normalize(location.href).fullpath !== normalize(e.detail.requestURL).fullpath ) {
        _replaceState.call(history, null, null, e.detail.requestURL);
      }
    });
    
    routes.href = function(url, body) {
      if( typeof url === 'number' ) url = url + '';
      if( !url || typeof url !== 'string' ) return;
      if( url[0] === '#' ) {
        location.href = url;
      } else {
        _pushState.call(history, null, null, routes.normalize(url));
        routes.exec(location.href, body);
      }
    };
  } else if( mode === 'hash' ) {
    if( !('onhashchange' in window) ) return console.error('[x-router] unsupported \'onhashchange\'');
    
    addEventListener(window, 'hashchange', function() {
      routes.exec(location.hash);
    });
    
    routes.on('redirect', function(e) {
      location.href = '#' + e.detail.url;
    });
    
    routes.href = function(url) {
      location.href = '#' + routes.normalize(url);
    };
  }
  
  var observer;
  function bootup() {
    function routify(a) {
      if( !a.__routes_managed__ ) {
        a.__routes_managed__ = true;
        addEventListener(a, 'click', function(e) {
          var pass = a.hasAttribute('pass');
          var href = a.getAttribute('data-href') || a.getAttribute('href');
          var p = href.indexOf(':'), s = href.indexOf('/');
          if( !href || (~p && p < s) ) return;
          if( !pass ) e.preventDefault();
          routes.href(href);
        });
      }
      return this;
    }
  
    function scan() {
      [].forEach.call(document.querySelectorAll('[route], [data-route], [routes], [data-routes]'), routify);
      return this;
    }
    
    scan();
    routes.exec(location.href);
    
    // observe anchor tags
    if( window.MutationObserver && config('observe') !== 'false' ) {
      if( observer ) observer.disconnect();
      observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          [].forEach.call(mutation.addedNodes, function(node) {
            if( node.nodeType === 1 ) {
              if( node.hasAttribute('route') || node.hasAttribute('routes') ) routify(node);
              if( node.hasAttribute('data-route') || node.hasAttribute('data-routes') ) routify(node);
              if( node.querySelectorAll ) [].forEach.call(node.querySelectorAll('[route], [data-route], [routes], [data-routes]'), routify);
            }
          });
        });
      });
    
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  
  if( document.body ) bootup();
  else addEventListener(document, 'DOMContentLoaded', bootup);
  
  window.route = routes.href;
})();

module.exports = routes;

