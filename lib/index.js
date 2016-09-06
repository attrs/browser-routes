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

var a = document.createElement('a');
function normalize(url) {
  if( typeof url !== 'string' ) throw new TypeError('illegal url');
  
  a.href = url || '';
  var fullpath = a.href;
  fullpath = fullpath.substring(fullpath.indexOf('://') + 3);
  if( !~fullpath.indexOf('/') ) fullpath = '/';
  else fullpath = fullpath.substring(fullpath.indexOf('/'));
  
  var pathname = fullpath;
  pathname = ~pathname.indexOf('?') ? pathname.substring(0, pathname.indexOf('?')) : pathname;
  pathname = ~pathname.indexOf('#') ? pathname.substring(0, pathname.indexOf('#')) : pathname;
  
  return {
    href: a.href,
    protocol: a.protocol,
    hostname: a.hostname,
    port: a.port,
    pathname: pathname,
    fullpath: pathname + (a.search ? a.search : '') + (a.hash ? a.hash : ''),
    search: a.search,
    hash: a.hash,
    host: a.host
  };
}


function config(name, alt) {
  var root = document.head.querySelector('meta[name=\"' + name + '\"][content]');
  return (root && root.getAttribute('content')) || alt;
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
      decode = function (s) { return decodeURIComponent(s.replace(pl, ' ')); };
      
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

function EventObject(type, detail, src) {
  this.type = type;
  this.detail = detail || {};
  this.src = src;
}
/*
EventObject.prototype = {
  preventDefault: function() {
  },
  stopPropagation: function() {
  }
};*/




// factory Router
function Router(id) {
  id = id || (Math.random() + '') || 'unknwon';
  var boot = true;
  var routes = [];
  var listeners = {};
  var error;
  
  var body = function Router(req, res, onext) {
    if( !req.url || req.url[0] !== '/' ) return console.error('[x-router] illegal state: url not defined in request: ', req.url);
    error = null;
    onext = onext || function() {};
    
    var oParentURL = req.parentURL || '';
    var oURL = req.url;
    var oParams = req.params || {};
    var i = 0, finished = false;
    
    var next = function(err) {
      if( finished ) return console.error('[x-router] next function twice called.', id, err);
      finished = true;
      
      req.url = oURL;
      req.parentURL = oParentURL;
      req.params = oParams;
      boot = false;
      
      if( err ) return body.fire('error', {
        href: req.href,
        url: req.url,
        request: req,
        response: res,
        error: err
      }) && onext(err);
      
      body.fire('notfound', {
        href: req.href,
        url: req.url,
        request: req,
        response: res
      });
      
      onext();
    };
    
    var forward = function(err) {
      if( err ) return next(err);
      
      var route = routes[i++];
      if( !route ) return next();
      if( !boot && route.type === 'boot' ) return forward();
      //console.log(route, boot, route.pattern, route.pattern.match(req.url));
      
      var params = route.pattern && route.pattern.match(req.url);
      if( !params ) return forward();
      
      req.boot = boot;
      req.params = oParams;
      req.parentURL = oParentURL;
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
      
      body.fire('route', {
        routetype: route.type,
        config: route,
        parentURL: req.parentURL,
        url: req.url,
        href: path.join(req.baseURL, req.parentURL, req.url),
        fn: route.fn,
        params: params,
        boot: boot,
        request: req,
        response: res
      });
    };
    forward();
  };
  
  var adaptchild = function(fn) {
    if( fn.__router__ && fn.on && fn.fire ) {
      fn.on('route', function(e) {
        body.fire(e);
      });
    }
    
    return fn;
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
      fn: adaptchild(fn)
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
      fn: adaptchild(fn)
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
      fn: adaptchild(fn)
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
    var event;
    if( typeof type === 'string' ) {
      event = new EventObject(type, detail, body);
      event.srcRouter = body;
    } else if( type instanceof EventObject ) {
      event = type;
    } else {
      return console.error('[x-router] illegal arguments, type is must be a string or event', type);
    }
    
    event.router = body;
    var action = function(listener) {
      listener.call(this, event);
    };
    
    (listeners['*'] || []).forEach(action);
    (listeners[event.type] || []).forEach(action);
    
    return this;
  };
  
  body.hasListener = function(type) {
    return listeners[type] && listeners[type].length ? true : false;
  };
  
  return body;
}

// class Application
function Application(options) {
  var baseURL = '';
  var router = Router('root'), hashrouter, request, response;
  var session = {};
  var timeout, referer;
  
  Application.apps.push(router);
  
  router.timeout = function(msec) {
    if( typeof msec !== 'number' ) return console.warn('illegal timeout ' + msec);
    timeout = msec;
  };
  
  router.base = function(url) {
    if( !arguments.length ) return baseURL;
    if( !url ) {
      baseURL = '';
      return this;
    }
    baseURL = path.dirname(path.resolve(url, 'index.html'));
    return this;
  };
  
  router.router = function(name) {
    return Router(name);
  };
  
  router.fullhref = function(url) {
    url = url.trim();
    if( !url ) url = baseURL;
    else if( url[0] === '/' ) url = baseURL + url;
    else if( !request ) url = baseURL + '/' + url;
    else if( request.href ) url = path.dirname(request.href) + '/' + url;
    else console.error('cannot resolve href', url);
    
    return normalize(url.split('//').join('/')).fullpath;
  };
  
  router.hash = function(hash, next) {
    request.hash = hash || '';
    hashrouter(request, response, next);
    return this;
  };
  
  router.href = function(href, body, options) {
    if( typeof body === 'boolean' ) options = {writestate:body}, body = null;
    href = href || '';
    
    var parsed = normalize(router.fullhref(href));
    var url = parsed.pathname;
    if( url.indexOf(baseURL) !== 0 )
      return console.error('given href \'' + url + '\' is not a sub url of base url \'' + baseURL + '\'');
    url = url.substring(baseURL.length);
    
    //console.log('href', arguments[0], url);
    
    if( request && request.href === parsed.fullpath ) return;
    if( typeof options === 'boolean' ) options = {writestate:options};
    if( !options || typeof options !== 'object' ) options = {};
    
    hashrouter = Router('hash');
    request = router.request = {
      app: router,
      referer: referer,
      method: 'get',
      parsed: parsed,
      baseURL: baseURL,
      href: parsed.fullpath,
      url: url || '/',
      options: options,
      hashname: parsed.hash,
      query: parseQuery(parsed.search),
      params: {},
      body: body || {},
      session: session
    };
    
    //console.log('req', capture(request));
    
    var finished = false;
    response = router.response = {
      redirect: function(to, body, options) {
        finished = true;
        options = options || {};
        options.redirect = true;
        body = body || request.body || {};
        
        if( to[0] !== '#' && to[0] !== '/' ) {
          to = path.join(request.parentURL, request.url, to);
        }
        
        router.fire('redirect', {
          options: options,
          referer: (referer = normalize(path.join(request.baseURL, request.url)).href),
          to: to,
          requested: arguments[0],
          request: request,
          response: response
        });
        
        router.href(to, body, options);
        return this;
      },
      hash: function(hash, fn) {
        hashrouter.get('#' + hash, fn);
        return this;
      },
      exechash: function(hash, done) {
        router.exechash(req.hash, done);
        return this;
      },
      end: function(exechash) {
        if( finished ) return console.warn('[x-router] request \'' + request.href + '\' already finished.');
        finished = true;
        
        var fire = function(err) {
          router.fire('end', {
            href: parsed.fullpath,
            url: url,
            error: err,
            request: request,
            response: response
          });
        };
        
        if( !err && exechash !== false ) router.exechash(req.hash, fire);
        else fire(router.error);
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
      href: parsed.fullpath,
      url: url,
      request: request,
      response: response
    });
    
    if( options.writestate !== false && options.replacestate !== true && options.redirect !== true ) {
      referer = parsed.fullpath;
    }
    
    router(request, response, function(err) {
      if( err ) return router.fire('error', {
        href: parsed.fullpath,
        url: url,
        request: request,
        response: response,
        error: err
      });
      
      router.fire('notfound', {
        href: parsed.fullpath,
        url: url,
        request: request,
        response: response
      });
    });
    return this;
  };
  
  router.on('*', function(e) {
    e.app = router;
    Application.fire(e);
  });
  
  return router;
};

// initialize context feature
(function() {
  var currentapp, apps = [], listeners = {};
  
  var current = function(app) {
    if( !arguments.length ) return currentapp || apps[0];
    if( !~apps.indexOf(app) ) return console.error('[x-router] not defined app', app);
    currentapp = app;
    return this;
  };
  
  var href = function() {
    var app = current();
    if( !app ) return console.error('[x-router] not yet initialized');
    app.href.apply(currentapp, arguments);
  };
  
  var on = function(type, fn) {
    listeners[type] = listeners[type] || [];
    listeners[type].push(fn);
    return this;
  };
  
  var once = function(type, fn) {
    var wrap = function(e) {
      off(type, wrap);
      return fn.call(Application, e);
    };
    on(type, wrap);
    return this;
  };

  var off = function(type, fn) {
    var fns = listeners[type];
    if( fns )
      for(var i;~(i = fns.indexOf(fn));) fns.splice(i, 1);
    
    return this;
  };

  var fire = function(event) {
    var action = function(listener) {
      listener.call(this, event);
    };
    
    (listeners['*'] || []).forEach(action);
    (listeners[event.type] || []).forEach(action);
    
    return this;
  };
  
  Application.apps = apps;
  Application.Router = Router;
  Application.current = current;
  Application.href = href;
  Application.on = on;
  Application.once = once;
  Application.off = off;
  Application.fire = fire;
  
  // @deprecated
  //Application.router = Router;
})();

module.exports = Application;

// instantiate main routes && trigger
(function() {
  var mode = config('x-router.mode') || (history.pushState ? 'pushstate' : 'hash');
  if( !~['pushstate', 'hash', 'none'].indexOf(mode) ) {
    console.error('[x-router] unsupported mode: ' + mode);
    mode = history.pushState ? 'pushstate' : 'hash';
  }
  
  var app = function() {
    return Application.current() || {
      href:function() {
        console.error('[x-router] not yet initialized');
      }
    };
  };
  
  var validatelocation = function(href) {
    var base = app().base() || '';
    href = normalize(href || location.href).fullpath;
    if( !href.indexOf(base) ) return href.substring(base.length);
    return href;
  }
  
  if( mode === 'pushstate' ) {
    if( !history.pushState ) return console.error('[x-router] browser does not support \'history.pushState\'');
    
    var pushState = history.pushState;
    var replaceState = history.replaceState;
    
    history.pushState = function(state, title, href) {
      pushState.apply(history, arguments);
      app().href(validatelocation(), state);
    };
    
    history.replaceState = function(state, title, href) {
      replaceState.apply(history, arguments);
      app().href(validatelocation(), state, {
        replacestate: true
      });
    };
    
    window.onpopstate = function(e) {
      app().href(validatelocation(), e.state, {writestate:false});
    };
    
    var push = function(href, body) {
      pushState.call(history, body, null, href);
    };
    
    var replace = function(href, body) {
      replaceState.call(history, body, null, href);
    };
    
    Application.on('request', function(e) {
      if( app() !== e.app ) return;
      var href = e.detail.href;
      var body = e.detail.request.body;
      var o = e.detail.request.options;
      if( o.writestate === false ) return;
      if( o.replacestate || o.redirect ) replace(href, body);
      else push(href, body);
    });
    
    Application.on('end', function(e) {
      if( app() !== e.app ) return;
      var href = e.detail.href;
      var body = e.detail.request.body;
      var o = e.detail.request.options;
      if( o.writestate === false ) return;
      replace(href, body);
    });
    
    Application.on('route', function(e) {
      if( app() !== e.app ) return;
      //console.info('route', e.detail.href);
      
      /*var href = e.detail.href;
      var body = e.detail.request.body;
      var o = e.detail.request.options;
      if( o.writestate === false ) return;
      replace(href, body);*/
    });
  } else if( mode === 'hash' ) {
    addEventListener(window, 'hashchange', function() {
      //console.log('hashchange', location.hash);
      if( location.hash.length >= 1 ) app().href(location.hash.substring(1));
    });
    
    var replace = function(url, body) {
      location.replace('#' + url);
    };
    
    var push = function(url, body) {
      location.assign('#' + url);
    };
    
    Application.on('request', function(e) {
      if( app() !== e.app ) return;
      var url = e.detail.url;
      var body = e.detail.request.body;
      var o = e.detail.request.options;
      if( o.writestate === false ) return;
      if( o.replacestate || o.redirect ) replace(url, body);
      else push(url, body);
    });
    
    Application.on('end', function(e) {
      if( app() !== e.app ) return;
      var url = e.detail.url;
      var body = e.detail.request.body;
      var o = e.detail.request.options;
      if( o.writestate === false ) return;
      replace(url, body);
    });
  }
  
  var ie = (function(){
    var undef,
        v = 3,
        div = document.createElement('div'),
        all = div.getElementsByTagName('i');
        
    while(div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',all[0]);
    return v > 4 ? v : undef;
  }());
  
  var observer;
  function bootup() {
    function routify(a) {
      if( !a.__xrouter__ ) {
        a.__xrouter__ = true;
        
        a.onroute = null;
        a.onrouteresponse = null;
        a.onrouterequest = null;
        
        if( ie <= 8 ) {
          a.onclick = function(e) {
            var ghost = a.hasAttribute('data-ghost') || a.hasAttribute('ghost');
            var href = a.getAttribute('data-href') || a.getAttribute('href');
            var p = href.indexOf(':'), s = href.indexOf('/');
            
            if( !href || (~p && p < s) ) return;
            
            app().href(href, null, {
              writestate: ghost ? false : true
            });
            
            return false;
          };
        } else {
          a.onclick = function(e) {
            var ghost = a.hasAttribute('data-ghost') || a.hasAttribute('ghost');
            var href = a.getAttribute('data-href') || a.getAttribute('href');
            var p = href.indexOf(':'), s = href.indexOf('/');
            
            if( !href || (~p && p < s) ) return;
            e.preventDefault();
            
            app().href(href, null, {
              writestate: ghost ? false : true
            });
          };
        } 
      }
      return this;
    }
    
    var routeselector = '*[route], *[data-route], *[routes], *[data-routes]';
    function scan() {
      [].forEach.call(document.querySelectorAll(routeselector), routify);
      return this;
    }
    
    scan();
    
    if( mode === 'pushstate' ) app().href(validatelocation());
    else if( mode === 'hash' ) app().href(location.hash.substring(1));
    
    // observe anchor tags
    if( config('observe') !== 'false' ) {
      if( window.MutationObserver ) {
        if( observer ) observer.disconnect();
        observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            [].forEach.call(mutation.addedNodes, function(node) {
              if( node.nodeType === 1 ) {
                if( node.hasAttribute('route') || node.hasAttribute('routes') ) routify(node);
                if( node.hasAttribute('data-route') || node.hasAttribute('data-routes') ) routify(node);
                if( node.querySelectorAll ) [].forEach.call(node.querySelectorAll(routeselector), routify);
              }
            });
          });
        });
      
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      } else {
        window.setInterval(scan, 1000);
      }
    }
  }
  
  if( document.body ) bootup();
  else {
    if( document.addEventListener ) {
      document.addEventListener('DOMContentLoaded', function() {
        window.setTimeout(bootup,1);
      });
    } else if( document.attachEvent ) {
      document.attachEvent('onreadystatechange', function () {
        if( document.readyState === 'complete' ) window.setTimeout(bootup,1);
      });
    }
  };
  
  window.route = function() {
    var current = app();
    current.href.apply(current, arguments);
  };
})();
