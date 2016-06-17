/*(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    module.exports = factory();
  } else {
    this.Routes = factory();
  }
}(this, function() {
*/

var path = require('path');

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

function match(requri, uri) {
  //TODO: fix regexp matching
  return requri === uri;
}

function capture(o) {
  return JSON.parse(JSON.stringify(o));
}

function chain(scope, req, res, routes, next) {
  var i = 0, forward;
  return forward = function(err) {
    var route = routes[i++];
    if( err || !route ) return next(err);
    
    var uri = route.uri;
    var type = route.type;
    var fn = route.fn;
    
    //console.log('current', uri, type, fn);
    if( type === 'use' && uri ) {
      var opurl = req.purl || '';
      var ourl = req.url;
      req.purl = path.join(opurl, ourl.substring(0, uri.length));
      req.url = ourl.substring(uri.length) || '/';
      
      //console.log('routing', uri, req.purl, req.url);
      
      fn.apply(scope, [req, res, forward]);
      req.purl = opurl;
      req.url = ourl;
    } else {
      fn.apply(scope, [req, res, forward]);
    }
  };
}

function redirector(uri) {
  return function redirector(req, res, next) {
    res.redirect(uri);
  };
}


// factory Router
function Router(name) {
  name = name || 'unknwon';
  var boot = true;
  var routes = [];
  var listeners = {};
  
  var body = function Router(req, res, next) {
    next = next || function() {};
    
    //console.log('body', req.baseUrl, req.url);
    var fns = [];
    routes.forEach(function(route) {
      //console.log('route', route);
      if( !boot && route.boot ) return;
      if( route.type === 'use' ) {
        if( !route.uri || !req.url.indexOf(route.uri) || match(req.url, route.uri) ) return fns.push(route);
      } else if( route.type === 'get' ) {
        //console.log(name, req.url || '(no)', route.uri || '(no)');
        if( match(req.url, route.uri) ) return fns.push(route);
      }
    });
    
    /*console.info('[' + name + '] fns', req.url, fns.map(function(o) {
      return (o.uri || 'any') + '(' + (o.fn.name || 'unnamed') + ')';
    }));*/
    
    req.boot = boot;
    chain(body, req, res, fns, next)(req.error);
    boot = false;
  };
  
  body.exists = function(url) {
    var exists = false;
    routes.forEach(function(route) {
      //console.log('exists', url, route.uri);
      if( route.type === 'get' && match(url, route.uri) ) return exists = true;
      else if( route.type === 'use' && route.uri && !url.indexOf(route.uri) ) { // middleware 는 포함하지 않음
        if( typeof route.fn.exists !== 'function' ) return exists = match(url, route.uri);
        exists = route.fn.exists(url.substring(route.uri.length));
      }
    });
    return exists;
  };
  
  body.use = function(uri, fn) {
    if( typeof uri === 'function' ) fn = uri, uri = null;
    if( uri && typeof uri !== 'string' ) throw new TypeError('illegal type of uri:' + typeof(uri));
    if( typeof fn === 'string' ) fn = redirector(fn);
    if( typeof fn !== 'function' ) throw new TypeError('illegal type of router:' + typeof(fn));
    //if( uri && !endsWith(uri, '/') ) uri = uri + '/';
    
    routes.push({
      type: 'use',
      uri: uri,
      fn: fn
    });
    return this;
  };
  
  body.get = function(uri, fn) {
    if( typeof uri !== 'string' ) throw new TypeError('illegal type of uri:' + typeof(uri));
    if( typeof fn === 'string' ) fn = redirector(fn);
    if( typeof fn !== 'function' ) throw new TypeError('illegal type of router:' + typeof(fn));
    
    routes.push({
      type: 'get',
      uri: uri,
      fn: fn
    });
    return this;
  };
  
  body.boot = function(fn) {
    if( typeof fn !== 'function' ) throw new TypeError('illegal type of router:' + typeof(fn));
    routes.push({
      type: 'use',
      boot: true,
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
    if( type === 'error' && !(listeners[type] && isteners[type].length) )
      return console.error('[routes] error', detail);
    
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
  
  options = options || {};
  
  var self = this;
  var baseURL = '';
  var router = Router('root'), request, response, hashroutes;
  
  //console.info('baseURL', baseURL);
  
  this.config = function(key, value) {
    var o = options;
    if( arguments.length === 1 ) return o(key);
    if( value === null ) delete o[key];
    else o[key] = value;
    return this;
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
  
  var exec = this.exec = function(requrl) {
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
      method: 'get',
      parsed: parsed,
      baseURL: baseURL,
      requestURL: fullpath,
      url: url,
      hashname: hash,
      query: parseQuery(query),
      params: {}
    };
    
    response = {
      redirect: function(tourl) {
        //console.info('redirect', url, request.purl, request.url, request);
        if( tourl.startsWith('#') ) {
          location.href = tourl;
        } else if( tourl.startsWith('/') ) {
          exec(path.join(baseURL, tourl));
        } else {
          exec(path.join(baseURL, request.purl, request.url, tourl));
        }
        
        router.fire('redirect', {
          requestURL: fullpath,
          url: url,
          request: request,
          response: response
        });
        
        return this;
      },
      hash: function(hash, fn) {
        hashroutes.push({hash:hash, fn:fn});
      }
    };
    
    router.fire('request', {
      requestURL: fullpath,
      url: url,
      request: request,
      response: response
    });
    
    router(request, response);
    return this;
  };
  
  this.exechash = function() {
    // TODO: hash 변경. 현재 request 의 hash 를 라우팅한다.
    return this;
  };
  
  // --- wire to router
  this.use = function(uri, fn) {
    router.use.apply(router, arguments);
    return this;
  };
  
  this.boot = function(fn) {
    router.boot(fn);
    return this;
  };
  
  this.get = function(uri, fn) {
    router.get(uri, fn);
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
  
  this.exists = function(uri) {
    return router.exists(uri);
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
    if( !history.pushState ) return console.error('[routes] unsupported \'history.pushState\'');
    
    var _pushState = history.pushState;
    history.pushState = function(state, title, url) {
      _pushState.apply(history, arguments);
      routes.exec(location.href);
    };
    
    window.onpopstate = function(e) {
      routes.exec(location.href);
    };
    
    routes.on('request', function(e) {
      if( normalize(location.href).fullpath !== normalize(e.detail.requestURL).fullpath ) {
        _pushState.call(history, null, null, e.detail.requestURL);
      }
    });
    
    routes.href = function(url) {
      history.pushState(null, null, routes.normalize(url));
    };
  } else if( mode === 'hash' ) {
    if( !('onhashchange' in window) ) return console.error('[routes] unsupported \'onhashchange\'');
    
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
          e.preventDefault();
          routes.href(a.getAttribute('href'));
        });
      }
      return this;
    }
  
    function scan() {
      [].forEach.call(document.querySelectorAll('[routes], [data-routes]'), routify);
      return this;
    }
    
    // observe anchor tags
    if( observer ) observer.disconnect();
    observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        [].forEach.call(mutation.addedNodes, function(node) {
          if( node.nodeType === 1 ) {
            if( node.hasAttribute('routes') ) routify(node);
            if( node.hasAttribute('data-routes') ) routify(node);
            if( node.querySelectorAll ) [].forEach.call(node.querySelectorAll('[routes], [data-routes]'), routify);
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    scan();
    routes.exec(location.href);
  }
  
  if( document.body ) bootup();
  else addEventListener(document, 'DOMContentLoaded', bootup);
})();

module.exports = routes;
