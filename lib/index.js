var path = require('path');
var URL = require('url');
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

if( !document.head ) document.head = document.getElementsByTagName("head")[0];

function meta(name, alt) {
  var tag = document.head.querySelector('meta[name="xrouter.' + name + '"]');
  return (tag && tag.getAttribute('content')) || alt;
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

function addEventListener(scope, type, fn, bubble) { 
  if( scope.addEventListener ) scope.addEventListener(type, fn, bubble);
  else scope.attachEvent(type, fn); 
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

function mix() {
  var result = {};
  [].forEach.call(arguments, function(o) {
    if( o && typeof o === 'object' ) {
      for(var k in o ) result[k] = o[k];
    }
  });
  return result;
}

// event
var EventObject = (function() {
  function EventObject(type, detail, target, cancelable) {
    this.type = type;
    this.detail = detail || {};
    this.target = this.currentTarget = target;
    this.cancelable = cancelable === true ? true : false;
    this.defaultPrevented = false;
    this.stopped = false;
    this.timeStamp = new Date().getTime();
  }

  EventObject.prototype = {
    preventDefault: function() {
      if( this.cancelable ) this.defaultPrevented = true;
    },
    stopPropagation: function() {
      this.stopped = true;
    },
    stopImmediatePropagation: function() {
      this.stoppedImmediate = true;
    }
  };

  EventObject.createEvent = function(type, detail, target, cancelable) {
    return new EventObject(type, detail, target, cancelable);
  };
  
  return EventObject;
})();

var routermark = {};

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
      
      if( err ) {
        body.fire('error', {
          router: body,
          href: req.href,
          url: req.currentURL,
          request: req,
          response: res,
          error: err
        });
        
        return onext(err);
      }
      
      body.fire('notfound', {
        router: body,
        href: req.href,
        url: req.currentURL,
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
      req.params = mix(oParams, params);
      
      var fn = route.fn;
      var routepath = route.path;
      var type = route.type;
      
      if( typeof fn == 'string' ) {
        fn = fn.trim();
        if( !fn.indexOf('/') || !fn.indexOf('..') ) {
          return res.redirect(path.resolve(req.parentURL, fn));
        } else {
          req.url = oURL = '/' + fn.split('./').join('');
          req.app.replace(path.join(req.parentURL, req.url));
          return forward();
        }
      }
      
      var parentURL = req.parentURL = oParentURL;
      var url = req.url = oURL;
      var div = dividepath(routepath, url);
      var currentURL = path.join(oParentURL, div.parent);
      
      req.boot = boot;
      req.currentURL = currentURL;
      
      if( fn.__router__ ) {
        url = req.url = div.sub;
        parentURL = req.parentURL = currentURL;
      }
      
      body.fire('route', {
        routetype: type,
        config: route,
        url: currentURL,
        href: req.href,
        fn: fn,
        params: params,
        boot: boot,
        request: req,
        response: res
      });
      
      route.fn.apply(body, [req, res, forward]);
    };
    forward();
  };
  
  body.id = id;
  body.__router__ = routermark;
  
  var adaptchild = function(fn) {
    if( fn.__router__ === routermark ) {
      fn.parent = body;
    }
    return fn;
  };
  
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
    
    routes.push({
      type: 'use',
      path: path || '/',
      pattern: patternize(path, true),
      fn: adaptchild(fn)
    });
    return this;
  };
  
  body.get = function(path, fn) {
    if( typeof path === 'function' ) fn = path, path = '/';
    if( typeof path !== 'string' ) throw new TypeError('illegal type of path:' + typeof(path));
    
    routes.push({
      type: 'get',
      path: path || '/',
      pattern: patternize(path),
      fn: fn
    });
    return this;
  };
  
  body.boot = function(path, fn) {
    if( typeof path === 'function' ) fn = path, path = '/';
    if( typeof path !== 'string' ) throw new TypeError('illegal type of path:' + typeof(path));
    
    routes.push({
      type: 'boot',
      path: path || '/',
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
    var typename = (type && type.type) || type;
    if( !listeners[typename] && !listeners['*'] && !(typename === 'route' && body.parent) ) return;
    
    var event;
    if( typeof type === 'string' ) {
      event = EventObject.createEvent(type, detail, body);
    } else if( type instanceof EventObject ) {
      event = type;
    } else {
      return console.error('[x-router] illegal arguments, type is must be a string or event', type);
    }
    event.currentTarget = body;
    
    var stopped = false, prevented = false;
    var action = function(listener, scope) {
      if( stopped ) return;
      listener.call(scope, event);
      if( event.defaultPrevented === true ) prevented = true;
      if( event.stoppedImmediate === true ) stopped = true;
    };
    
    (listeners['*'] || []).forEach(action, body);
    (listeners[event.type] || []).forEach(action, body);
    
    if( event.type === 'route' && body.parent ) {
      body.parent.fire(event);
    }
    
    return !prevented;
  };
  
  body.hasListener = function(type) {
    if( typeof type === 'function' ) {
      var found = false;
      listeners.forEach(function(fn) {
        if( found ) return;
        if( fn === type ) found = true;
      });
      return found;
    }
    return listeners[type] && listeners[type].length ? true : false;
  };
  
  return body;
}

// class Application
function Application() {
  var baseURL = '',
    router = Router('root'),
    hashrouter,
    options = {},
    request,
    response,
    session = {},
    engines = {},
    timeout,
    config = {},
    referer,
    laststate,
    lasthref;
  
  Application.apps.push(router);
  
  router.debug = meta('debug') === 'true' ? true : (options.debug ? true : false);
  
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
  
  var _get = router.get;
  router.get = function(key) {
    if( arguments.length <= 1 ) return config[key];
    return _get.apply(router, arguments);
  };
  
  router.set = function(key, value) {
    config[key] = value;
    if( key === 'debug' ) router.debug = value;
    return this;
  };
  
  router.router = function(name) {
    return Router(name);
  };
  
  router.fullhref = function(url) {
    url = url.trim();
    if( !url ) url = baseURL;
    else if( url[0] === '/' ) url = baseURL + url;
    else if( !laststate ) url = baseURL + '/' + url;
    else if( laststate ) url = path.dirname(laststate) + '/' + url;
    else console.error('cannot resolve href', url);
    
    return normalize(url.split('//').join('/')).fullpath;
  };
  
  router.engine = function(name, fn) {
    if( arguments.length === 1 ) return engines[name] || Application.engine(name);
    engines[name] = fn;
    return this;
  };
  
  router.replace = function(href, body) {
    var parsed = normalize(router.fullhref(href || ''));
    var url = parsed.pathname;
    if( url.indexOf(baseURL) !== 0 )
      return console.error('given href \'' + url + '\' is not a sub url of base url \'' + baseURL + '\'');
    
    url = url.substring(baseURL.length);
    laststate = parsed.fullpath;
    router.fire('replace', {
      href: parsed.fullpath,
      url: url,
      body: body
    });
    return this;
  };
  
  router.href = function(href, body, options) {
    if( typeof body === 'boolean' ) options = {writestate:body}, body = null;
    if( typeof options === 'boolean' ) options = {writestate:options};
    if( !options || typeof options !== 'object' ) options = {};
    if( options.ghost === true ) options.writestate = true;
    
    if( router.debug ) console.info('href', href, lasthref, laststate);
    
    var parsed = normalize(router.fullhref(href || ''));
    var url = parsed.pathname;
    var force = options.force === true ? true : false;
    if( url.indexOf(baseURL) !== 0 )
      return console.error('given href \'' + url + '\' is not a sub url of base url \'' + baseURL + '\'');
    
    url = url.substring(baseURL.length);
    
    //console.log('href', arguments[0], url););
    if( !force && lasthref === parsed.fullpath ) return;
    if( options.writestate !== false ) referer = laststate, laststate = lasthref = parsed.fullpath;
    
    if( router.debug ) console.log('request', parsed.fullpath);
    
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
      render: function(src, options, done) {
        if( arguments.length == 2 && typeof options === 'function' ) done = options, options = null;
        done = done || function(err) {
          if( err ) return console.error(err);
        };
        
        options = options || {};
        if( typeof options === 'string' ) options = {target:options};
        if( typeof options !== 'object' ) return done(new TypeError('options must be an object or string(target)'));
        if( typeof done !== 'function' ) return done(new TypeError('callback must be a function'));
        
        options.target = options.target || config['view target'];
        if( !options.target ) return done(new Error('missing options.target'));
        
        if( typeof options.target === 'string' ) {
          var target = document.querySelector(options.target);
          if( !target ) return done(new Error('target not found:' + options.target));
          options.target = target;
        }
        
        var enginename = config['view engine'] || 'default';
        var engine = router.engine(enginename);
        var base = config['views'] || '/';
        
        if( !engine ) return done(new Error('not exists engine: ' + enginename));
        if( typeof src === 'string' && !(~src.indexOf('://') || src.indexOf('//') == 0) ) {
          if( src.trim()[0] === '/' ) src = '.' + src;
          src = URL.resolve(base, src);
        }
        
        if( router.fire('beforerender', {
          options: options,
          src: src,
          target: target,
          url: request.currentURL,
          request: request,
          response: response
        }) ) {
          engine(src, options, function(err, result) {
            if( err ) return done(err);
            
            router.fire('render', {
              options: options,
              src: src,
              target: target,
              url: request.currentURL,
              request: request,
              response: response
            });
            
            done(null, result);
          });
        }
        
        return this;
      },
      redirect: function(to, body, options) {
        response.end();
        options = options || {};
        options.redirect = true;
        body = body || request.body || {};
        
        if( to[0] !== '#' && to[0] !== '/' ) {
          to = path.resolve(path.join(request.parentURL, request.url), to);
        }
        
        router.fire('redirect', {
          options: options,
          referer: laststate,
          url: request.currentURL,
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
        
        //router.exechash(req.hash, fire);
        
        router.fire('end', {
          href: parsed.fullpath,
          url: request.currentURL,
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
      href: parsed.fullpath,
      url: url,
      request: request,
      response: response
    });
    
    if( options.writestate !== false && options.replacestate !== true && options.redirect !== true ) {
      referer = parsed.fullpath;
    }
    
    router(request, response);
    return this;
  };
  
  router.on('*', function wrapapp(e) {
    e.app = router;
    if( !e.stopped ) Application.fire(e);
  });
  
  return router;
};

// initialize context feature
(function() {
  var currentapp, apps = [], listeners = {}, engines = {};
  
  var current = function(app) {
    if( !arguments.length ) return currentapp || apps[0];
    if( !~apps.indexOf(app) ) return console.error('[x-router] not defined app', app);
    currentapp = app;
    return this;
  };
  
  var href = function() {
    var app = current();
    if( !app ) return console.warn('[x-router] not yet initialized');
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
    if( !listeners[event.type] ) return;
    
    var stopped = false, prevented = false;
    var action = function(listener) {
      if( stopped ) return;
      listener.call(this, event);
      if( event.defaultPrevented === true ) prevented = true;
      if( event.stoppedImmediate === true ) stopped = true;
    };
    
    listeners[event.type].forEach(action);
    return !prevented;
  };
  
  var engine = function(name, fn) {
    if( arguments.length === 1 ) return engines[name];
    engines[name] = fn;
    return this;
  };
  
  Application.apps = apps;
  Application.Router = Router;
  Application.current = current;
  Application.href = href;
  Application.engine = engine;
  Application.on = on;
  Application.once = once;
  Application.off = off;
  Application.fire = fire;
  
  // @deprecated
  //Application.router = Router;
})();

// add default rendering engine
(function() {
  var container = document.createElement('div');
  function evalhtml(html) {
    container.innerHTML = html;
    var childnodes = container.childNodes;
    container.innerHTML = '';
    return childnodes;
  }

  function ajax(src, done) {
    if( !src ) throw new Error('missing src');
    var text, error;
    var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
    xhr.open('GET', src, true);
    xhr.onreadystatechange = function(e) {
      if( this.readyState == 4 ) {
        if( this.status == 0 || (this.status >= 200 && this.status < 300) ) done(null, this.responseText);
        else done(new Error('[' + this.status + '] ' + this.responseText));
      }
    };
    xhr.send();
  }
  
  Application.engine('default', function defaultRenderer(src, options, done) {
    var target = options.target;
    var render = function(err, contents) {
      if( err ) return done(err);
      if( typeof contents === 'string' ) contents = evalhtml(contents);
      if( isNode(contents) ) contents = [contents];
      
      [].forEach.call(contents, function(node) {
        target.appendChild(node);
      });
      done(null, target);
    };
    
    if( typeof src === 'string' ) ajax(src, render);
    else render(null, src);
  });
})();

module.exports = Application;

// instantiate main routes && trigger
(function() {
  var mode = meta('mode') || (history.pushState ? 'pushstate' : 'hash');
  if( !~['pushstate', 'hash', 'none'].indexOf(mode) ) {
    console.error('[x-router] unsupported mode: ' + mode);
    mode = history.pushState ? 'pushstate' : 'hash';
  }
  
  var app = function() {
    return Application.current();
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
      Application.href(validatelocation(), state);
    };
    
    history.replaceState = function(state, title, href) {
      replaceState.apply(history, arguments);
      Application.href(validatelocation(), state, {
        replacestate: true
      });
    };
    
    window.onpopstate = function(e) {
      Application.href(validatelocation(), e.state, {writestate:false});
    };
    
    var push = function(href, body) {
      pushState.call(history, body, null, href);
    };
    
    var replace = function(href, body) {
      replaceState.call(history, body, null, href);
    };
    
    Application.on('replace', function(e) {
      if( app() !== e.app ) return;
      replace(e.detail.href, e.detail.body);
    });
    
    Application.on('request', function(e) {
      if( app() !== e.app ) return;
      var href = e.detail.href;
      var body = e.detail.request.body;
      var o = e.detail.request.options;
      if( o.writestate === false ) return;
      if( o.replacestate || o.redirect ) replace(href, body);
      else push(href, body);
    });
  } else if( mode === 'hash' ) {
    var lasturl;
    addEventListener(window, 'hashchange', function() {
      var url = location.hash.substring(1);
      if( url === lasturl ) return;
      if( url ) Application.href(location.hash.substring(1));
    });
    
    var replace = function(url, body) {
      lasturl = url;
      location.replace('#' + url);
    };
    
    var push = function(url, body) {
      lasturl = url;
      location.assign('#' + url);
    };
    
    Application.on('replace', function(e) {
      if( app() !== e.app ) return;
      replace(e.detail.url, e.detail.body);
    });
    
    Application.on('request', function(e) {
      if( app() !== e.app ) return;
      var url = e.detail.url;
      var body = e.detail.request.body;
      var o = e.detail.request.options;
      if( o.writestate === false ) return;
      if( o.replacestate || o.redirect ) replace(url, body);
      else push(url, body);
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
            
            Application.href(href, null, {
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
            
            Application.href(href, null, {
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
    
    if( mode === 'pushstate' ) Application.href(validatelocation());
    else if( mode === 'hash' ) Application.href(location.hash.substring(1));
    
    // observe anchor tags
    if( meta('observe') !== 'false' ) {
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
  
  /* will be @deprecated : xrouter.href(...) */
  window.route = function() {
    console.warn('[x-router] window.route() is deprecated, use window.xrouter.href()');
    var current = app();
    current.href.apply(current, arguments);
  };
  
  window.xrouter = Application;
})();

