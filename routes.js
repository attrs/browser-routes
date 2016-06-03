(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    module.exports = factory();
  } else {
    this.Routes = factory();
  }
}(this, function() {
  function normalize(href, doc) {
    var a = (doc || document).createElement('a');
    a.href = href;
    return {
      href: href,
      protocol: a.protocol,
      hostname: a.hostname,
      port: a.port,
      pathname: a.pathname,
      dirname: dirname(a.pathname) + '/',
      search: a.search,
      hash: a.hash,
      host: a.host
    };
  }
  
  function dirname(src) {
    if( src[src.length - 1] === '/' ) return src.substring(0, src.length - 1);
    else return src.substring(0, src.lastIndexOf('/')) || '/';
  }
  
  function config(name, alt) {
    var root = document.head.querySelector('meta[name="' + name + '"][content]');
    return (root && root.getAttribute('content')) || alt;
  }
  
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
        var obaseUrl = req.baseURL, ourl = req.url;
        req.baseURL = uri.substring(0, uri.length);
        req.url = req.url.substring(uri.length) || '';
        fn.apply(scope, [req, res, forward]);
        req.baseURL = obaseUrl;
        req.url = ourl;
      } else {
        fn.apply(scope, [req, res, forward]);
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
  
  function addEventListener(scope, type, fn, bubble) { 
    if( scope.attachEvent ) scope.attachEvent(type,fn); 
    else scope.addEventListener(type,fn,bubble);
  }
  
  
  // factory Router
  function Router() {
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
        if( route.type === 'use' && (!route.uri || !req.url.indexOf(route.uri)) ) return fns.push(route);
        else if( route.type === 'get' && match(req.url, route.uri) ) return fns.push(route);
      });
      
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
    
    return body;
  }
  
  // class Routes
  function Routes(options) {
    if( !(this instanceof Routes) ) throw new Error('illegal state: \'new Routes()\' instead of \'Routes()\'');
    
    options = options || {};
    
    var baseURL = normalize(options.baseURL || document.baseURI);
    var router = Router(), request, response, hashroutes, currentURL;
    
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
    
    this.href = function(url) {
      this.exec(url);
      return this;
    };
    
    this.exec = function(url) {
      console.log('exec', url, request);
      
      var urlstring = url || currentURL || location.href;
      var url = normalize(urlstring);
      hashroutes = [];
      request = {
        method: 'get',
        parsed: url,
        baseURL: baseURL.dirname,
        originalUrl: url.pathname,
        url: url.pathname,
        hashname: url.hash,
        query: parseQuery(url.search),
        hash: function(hash, fn) {
          hashroutes.push({hash:hash, fn:fn});
        },
        params: {}
      };
      
      response = {
        redirect: this.href
      };
      
      console.log('start', request);
      
      router(request, response, function(err) {
        if( err ) return console.error(err);
      });
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
      
      window.onpopstate = function(event) {
        routes.href(location.href);
      };
      
      routes.href = function(url) {
        history.pushState(null, null, url);
      };
    } else if( mode === 'hash' ) {
      if( !('onhashchange' in window) ) return console.error('[routes] unsupported \'onhashchange\'');
      
      addEventListener(window, 'hashchange', function() {
        routes.exec(location.hash);
      });
      
      routes.href = function(url) {
        location.href = '#' + url;
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
  
  return routes;
}));
