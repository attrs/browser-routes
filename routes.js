// routes.js (amd, commonjs, plainjs)
// local 구동이거나 pushState() 미지원일 경우 hash (http://.../index.html#/uri ) 로 작동
// pushState() 사용 가능인 경우 pushState() 기반으로 동작

var normalize = require('web-util/url-normalize.js'),
  config = require('web-util/meta-config.js'),
  document = window.document,
  location = window.location,
  history = window.history,
  MutationObserver = window.MutationObserver;


function match(requri, uri) {
  return requri === uri;
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

function chain(scope, req, routes, next) {
  var i = 0, forward;
  return forward = function(err) {
    var route = routes[i++];
    if( !route ) return next(err);
    var uri = route.uri;
    var type = route.type;
    var fn = route.fn;
    var isErrorFunction = !uri && fn.length > 2;
    //console.log('current', routes, i, req.url, route, isErrorFunction);
    if( err && isErrorFunction ) {
      req.error = err;
      fn.apply(scope, [err, req, forward]);
    } else if( !isErrorFunction ) {
      if( type === 'use' && uri ) {
        var obaseUrl = req.baseUrl, ourl = req.url;
        req.baseUrl = uri.substring(0, uri.length);
        req.url = req.url.substring(uri.length) || '';
        fn.apply(scope, [req, forward]);
        req.baseUrl = obaseUrl;
        req.url = ourl;
      } else {
        fn.apply(scope, [req, forward]);
      }
    } else {
      forward(req.error);
    }
  };
}
  
function fire(scope, listeners, type, detail) {
  if( type === 'error' && !(listeners[type] && isteners[type].length) )
    return console.error('[routes] error', detail);
  
  (listeners[type] || []).forEach(function(listener) {
    listener.call(scope, {
      type: type,
      detail: detail || {}
    });
  });
}


// factory Router
function Router() {
  var boot = true;
  var routes = [];
  var listeners = {};
  
  var body = function(req, next) {
    next = next || function() {};
    
    //console.log('body', req.baseUrl, req.url);
    
    var fns = [], dropfns = [];
    routes.forEach(function(route) {
      //console.log('route', route);
      if( route.checker && !route.checker() ) return dropfns.push(route);
      else if( route.type === 'use' && (!route.uri || !req.url.indexOf(route.uri)) ) return fns.push(route);
      else if( route.type === 'get' && match(req.url, route.uri) ) return fns.push(route);
    });
    
    // drop
    dropfns.forEach(function(route) {
      routes.splice(routes.indexOf(route), 1);
    });
    
    //console.log('fns', fns, dropfns);
    
    req.boot = boot;
    chain(body, req, fns, next)(req.error);
    boot = false;
  };
  
  body.exists = function(url) {
    var exists = false;
    routes.forEach(function(route) {
      //console.log('exists', url, route.uri);
      
      if( route.checker && !route.checker() ) return;
      else if( route.type === 'get' && match(url, route.uri) ) return exists = true;
      else if( route.type === 'use' && route.uri && !url.indexOf(route.uri) ) { // middleware 는 포함하지 않음
        if( typeof route.fn.exists !== 'function' ) return exists = match(url, route.uri);
        exists = route.fn.exists(url.substring(route.uri.length));
      }
    });
    return exists;
  };
  
  body.use = function(uri, fn, checker) {
    if( typeof uri === 'function' ) checker = fn, fn = uri, uri = null;
    if( uri && typeof uri !== 'string' ) throw new TypeError('illegal type of uri:' + typeof(uri));
    if( typeof fn !== 'function' ) throw new TypeError('illegal type of router:' + typeof(fn));
    //if( uri && !endsWith(uri, '/') ) uri = uri + '/';
    
    routes.push({
      type: 'use',
      uri: uri,
      fn: fn,
      checker: checker || defaultChecker()
    });
    return this;
  };
  
  body.get = function(uri, fn, checker) {
    if( typeof uri !== 'string' ) throw new TypeError('illegal type of uri:' + typeof(uri));
    if( typeof fn !== 'function' ) throw new TypeError('illegal type of router:' + typeof(fn));
    
    routes.push({
      type: 'get',
      uri: uri,
      fn: fn,
      checker: checker || defaultChecker()
    });
    return this;
  };
  
  body.notfound = function(fn) {
    //TODO
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
  
  return body;
}

// class Routes
function Routes(options) {
  if( !(this instanceof Routes) ) throw new Error('illegal state: Routes must be instantiated');
  
  options = options || {};
  var routes = Router(), current, hashroutes;
  
  this.config = function(key, value) {
    var o = options;
    if( arguments.length === 1 ) return o(key);
    if( value === null ) delete o[key];
    else o[key] = value;
    return this;
  };
  
  this.router = function() {
    return Router();
  };
  
  var lastUrl;
  this.href = function(url) {
    if( !arguments.length ) return lastUrl || window.location.href;
    url = normalize(url);
    if( lastUrl === url.href ) return this;
    current = url.href;
    this.exec();
    //TODO: hash 만 변경되었을때, url 이 변경되었을때를 체크하여 method 를 다르게 exec 해줘야한다.
    return this;
  };
  
  this.exec = function() {
    var url = normalize(this.href());
    //console.log('exec', url);
    hashroutes = [];
    var request = current = {
      method: 'get',
      parsed: url,
      url: url.href,
      originalUrl: url.pathname,
      baseUrl: '/',
      url: url.pathname,
      hashname: url.hash,
      query: parseQuery(url.search),
      hash: function(hash, fn) {
        hashroutes.push({hash:hash, fn:fn});
      },
      params: {}
    };
    
    routes(request, function(err) {
      if( err ) return console.error(err);
    });
    return this;
  };
  
  this.exechash = function() {
    // TODO: hash 변경. 현재 request 의 hash 를 라우팅한다.
    return this;
  };
  
  // wire to router
  this.use = function(uri, fn) {
    routes.use.apply(routes, arguments);
    return this;
  };
  
  this.get = function(uri, fn) {
    routes.get(uri, fn);
    return this;
  };
  
  this.notfound = function(fn) {
    routes.notfound(fn);
    return this;
  };
  
  this.drop = function(fn) {
    routes.drop(fn);
    return this;
  };
  
  this.exists = function(uri) {
    return routes.exists(uri);
  };
  
  this.clear = function() {
    routes.clear();
    return this;
  };
  
  this.on = function(type, fn) {
    routes.on(type, fn);
    return this;
  };
  
  this.once = function(type, fn) {
    routes.once(type, fn);
    return this;
  };
  
  this.off = function(type, fn) {
    routes.off(type, fn);
    return this;
  };
}

var baseUrl = document.baseURI;
console.log('baseUrl', baseUrl);

// instantiate main routes && trigger
var trigger = (function() {
  if( !('onhashchange' in window) ) return console.error('[routes] unsupported browser');
  
  var always = config('routes.always') === 'true' ? true : false;
  var mode = config('routes.mode') || 'pushstate';
  var addEventListener = function(scope, type, fn, bubble) { 
    if( scope.attachEvent ) scope.attachEvent(type,fn); 
    else scope.addEventListener(type,fn,bubble);
  };
  var routes;
  var observer;
  
  if( history.pushState ) {
    var _pushState = history.pushState;
    history.pushState = function(state, title, url) {
      _pushState.apply(history, arguments);
      routes && routes.href(location.href);
    };
    
    window.onpopstate = function(event) {
      routes && routes.href(location.href);
    };
  } 
  
  if( 'onhashchange' in window ) {
    addEventListener(window, 'hashchange', function() {
      if( true || mode === 'hash' ) {
        var hash = location.hash;
        console.log('hash', hash);
        routes && routes.href(location.hash);
      } else routes && routes.href(location.hash);
    });
  }
  
  function routify(a) {
    if( !a.__routes_managed__ ) {
      a.__routes_managed__ = true;
      addEventListener(a, 'click', function(e) {
        if( a.hasAttribute('data-prevent') ) return e.preventDefault();
        
        var href = a.getAttribute('href');
        if( !href || ~href.indexOf('://') || !href.toLowerCase().indexOf('javascript:') || a.getAttribute('target') ) return;
        if( always || routes.exists(a.pathname) ) {
          e.preventDefault();
          //context.exec(e.target.href);
          if( mode === 'hash' ) {
            location.href = '#' + a.href;
          } else {
            if( location.href === a.href ) return;
            history.pushState({}, null, a.href);
          }
        }
      });
    }
    return this;
  }
  
  function scan() {
    [].forEach.call(document.querySelectorAll('[routes], [data-routes]'), routify);
    return this;
  }
  
  function bootup() {
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
    trigger.href(location.href);
  }
  
  if( document.body ) bootup();
  else addEventListener(document, 'DOMContentLoaded', bootup);
  
  return {
    context: function(context) {
      if( !arguments.length ) return routes;
      routes = context;
      return this;
    },
    href: function(url) {
      routes && routes.href(url);
      return this;
    },
    scan: scan,
    observer: function() {
      return observer;
    }
  }
})();


var root = new Routes();
root.Routes = Routes;
root.trigger = trigger;
trigger.context(root);
module.exports = root;