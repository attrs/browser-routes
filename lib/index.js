var path = require('path');
var URL = require('url');
var Router = require('tinyrouter');

var ROUTE_SELECTOR = '*[route], *[data-route], *[routes], *[data-routes]';

if( !document.head ) document.head = document.getElementsByTagName('head')[0];
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

function meta(name, alt) {
  var tag = document.head.querySelector('meta[name="xrouter.' + name + '"]');
  return (tag && tag.getAttribute('content')) || alt;
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

function capture(o) {
  return JSON.parse(JSON.stringify(o));
}

var Emitter = function(scope) {
  var listeners = {};
  
  var on = function(type, fn) {
    listeners[type] = listeners[type] || [];
    listeners[type].push(fn);
    return this;
  };
  
  var once = function(type, fn) {
    var wrap = function(e) {
      off(type, wrap);
      return fn.call(this, e);
    };
    body.on(type, wrap);
    return this;
  };
  
  var off = function(type, fn) {
    var fns = listeners[type];
    if( fns ) for(var i;~(i = fns.indexOf(fn));) fns.splice(i, 1);
    return this;
  };
  
  var emit = function(type, value) {
    var fns = listeners[type];
    (fns || []).forEach(function(fn) { fn.call(scope || this, value) });
    return this;
  };
  
  return {
    on: on,
    once: once,
    off: off,
    emit: emit
  };
};


var debug = meta('debug') === 'true' ? true : false;

// class Application
function Application(id) {
  id = id || 'root';
  if( Application.apps[id] ) return Application.apps[id];
  
  var baseURL = '',
    router = Router(id),
    hashrouter,
    request,
    response,
    session = {},
    engines = {},
    timeout,
    config = {},
    referer,
    history = [],
    currenthref,
    emitter = Emitter(router);
  
  Application.apps[id] = router;
  
  router.timeout = function(msec) {
    if( typeof msec !== 'number' ) return console.warn('illegal timeout ' + msec);
    timeout = msec;
  };
  
  router.emitter = function() {
    return emitter;
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
  
  var container = document.createElement('div');
  router.util = {
    evalhtml: function(html) {
      container.innerHTML = html;
      var children = [].slice.call(container.childNodes);
      container.innerHTML = '';
      return children;
    },
    ajax: function(src, done) {
      if( !src ) throw new Error('missing src');
      var text, error;
      var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
      xhr.open('GET', src, true);
      xhr.onreadystatechange = function(e) {
        if( this.readyState == 4 ) {
          if( this.status == 0 || (this.status >= 200 && this.status < 300) ) done.call(router, null, this.responseText);
          else done.call(router, new Error('[' + this.status + '] ' + this.responseText));
        }
      };
      xhr.send();
    }
  };
  
  router.fullhref = function(url) {
    var state = router.state();
    var o = url;
    if( !url ) return baseURL || '/';
    
    url = url.trim();
    if( url[0] === '/' ) {
      url = baseURL + url;
    } else {
      var currentdir = path.dirname(state);
      
      if( currentdir.length <= 1 ) currentdir = '';
      else currentdir += '/';
      
      if( !state ) url = baseURL + '/' + url;
      else url = baseURL + currentdir + url;
    }
    
    return normalize(url.split('//').join('/')).fullpath;
  };
  
  router.engine = function(name, fn) {
    if( arguments.length === 1 ) return engines[name] || Application.engine(name);
    engines[name] = fn;
    return this;
  };
    
  router.on('replace', function(e) {
    if( router.debug ) console.info('replaced', e.detail);
    currenthref = e.detail.replaced;
    
    var request = e.detail.request;
    if( request.options.writestate !== false ) {
      history[history.length - 1] = e.detail.replaced;
      router.fire('changestate', {
        state: request.parentURL + request.url,
        request: request,
        response: e.detail.response
      });
    }
  });
  
  router.state = function(index) {
    index = +index || 0;
    return history[history.length - 1 + index];
  };
  
  // @deprecated
  router.laststate = function() {
    console.warn('[x-router] router.laststate() is deprecated, use router.state() instead');
    return history[history.length - 1];
  };
  
  // @deprecated
  router.lasthref = function() {
    console.warn('[x-router] router.lasthref() is deprecated, use router.referer() instead');
    return referer;
  };
  
  router.history = function() {
    return history;
  };
  
  router.referer = function() {
    return referer;
  };
  
  router.reload = function(statebase) {
    statebase = statebase === false ? false : true;
    
    if( !statebase ) {
      if( currenthref ) return router.href(currenthref, null, {force: true});
      return;
    }
    
    var state = router.state();
    if( state ) return router.href(state, null, {force: true});
  };
  
  router.href = function(requesthref, body, options) {
    if( !arguments.length ) return currenthref;
    if( typeof body === 'boolean' ) options = {writestate:body}, body = null;
    if( typeof options === 'boolean' ) options = {writestate:options};
    if( !options || typeof options !== 'object' ) options = {};
    
    var fullhref = router.fullhref(requesthref);
    var href = fullhref.substring(baseURL.length) || '/';
    var parsed = normalize(href || '');
    var url = parsed.pathname;
    var force = options.force === true ? true : false;
    
    if( options.writestate === false ) force = true;
    if( router.get('always') === true ) force = true;
    
    if( router.debug ) console.info('href', requesthref, {
      fullhref: fullhref,
      href: href,
      url: url,
      force: force,
      prevstate: router.state(),
      referer: currenthref,
      writestate: options.writestate
    });
    
    if( !force && currenthref === parsed.fullpath ) return;
    
    referer = currenthref;
    currenthref = parsed.fullpath;
    if( options.writestate !== false ) {
      history.push(parsed.fullpath);
      if( history.length > 30 ) history = history.slice(history.length - 30);
    }
    
    if( router.debug ) console.info('request', currenthref);
    
    hashrouter = Router('hash');
    emitter = Emitter(router);
    var reqconfig = {};
    
    request = router.request = {
      referer: referer || '',
      app: router,
      requesthref: requesthref,
      originalhref: requesthref, // @deprecated
      fullhref: fullhref,
      href: parsed.fullpath,
      parsed: parsed,
      baseURL: baseURL,
      method: 'get',
      url: url || '/',
      options: options,
      hash: parsed.hash,
      hashname: parsed.hash, // @deprecated
      query: parseQuery(parsed.search),
      params: {},
      body: body || {},
      session: session,
      get: function(key) {
        console.warn('Deprecated: use response.get');
        return reqconfig[key];
      },
      set: function(key, value) {
        console.warn('Deprecated: use response.set');
        if( value === null || value === undefined ) delete reqconfig[key];
        else reqconfig[key] = value;
        return this;
      }
    };
    
    var finished = false;
    response = router.response = {
      render: function render(src, options, odone) {
        if( arguments.length == 2 && typeof options === 'function' ) odone = options, options = null;
        var done = function(err, result) {
          if( err ) return odone ? odone.call(this, err) : console.error(err);
          var oarg = [].slice.call(arguments, 1);
          var arg = [null, target];
          if( odone ) odone.apply(this, arg.concat(oarg));
        };
        
        if( !src ) return done(new Error('missing src'));
        if( typeof src == 'object' ) options = src, src = null;
        if( !options ) options = {};
        if( typeof options === 'string' ) options = {target:options};
        if( typeof options !== 'object' ) return done(new TypeError('options must be an object or string(target)'));
        
        var o = {};
        for(var k in options) o[k] = options[k];
        
        var target = o.target || reqconfig['view target'] || config['view target'];
        if( typeof target === 'string' ) target = document.querySelector(target);
        if( !target ) return done(new Error('view target not found: ' + (o.target || reqconfig['view target'] || config['view target'])));
        o.target = target;
        
        var extname = (typeof src === 'string') ? path.extname(src).substring(1).toLowerCase() : '';
        var defenginename = reqconfig['view engine'] || config['view engine'] || 'default';
        var enginename = extname || defenginename;
        var engine = router.engine(enginename) || router.engine(defenginename);
        var base = reqconfig['views'] || config['views'] || '/';
        
        if( !engine ) return done(new Error('not exists engine: ' + enginename));
        if( typeof src === 'string' && !(~src.indexOf('://') || src.indexOf('//') == 0) ) {
          if( src.trim()[0] === '/' ) src = '.' + src;
          
          src = path.join(base, src);
        }
        
        if( !src ) {
          if( options.html ) src = router.util.evalhtml(options.html);
          else if( options.el ) src = options.el;
          else return done(new Error('cannot resolve src (src or options.html, options.el must be defined)'));
        }
        
        if( router.fire('beforerender', {
          fullhref: fullhref,
          href: parsed.fullpath,
          options: o,
          src: src,
          target: target,
          url: request.currentURL,
          request: request,
          response: response
        }) ) {
          engine.call(router, src, o, function(err) {
            if( err ) return done(err);
            
            router.fire('render', {
              fullhref: fullhref,
              href: parsed.fullpath,
              options: o,
              src: src,
              target: target,
              url: request.currentURL,
              request: request,
              response: response
            });
            
            target.xrouter = router;
            
            /*[].forEach.call(target.querySelectorAll(ROUTE_SELECTOR), function(node) {
              node.xrouter = node.xrouter || router;
            });*/
            
            done.apply(this, arguments);
          });
        }
        
        return this;
      },
      get: function(key) {
        return reqconfig[key];
      },
      set: function(key, value) {
        if( value === null || value === undefined ) delete reqconfig[key];
        else reqconfig[key] = value;
        return this;
      },
      hash: function(hash, fn) {
        hashrouter.get('#' + hash, fn);
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
          fullhref: fullhref,
          href: parsed.fullpath,
          options: options,
          referer: referer,
          url: request.currentURL,
          to: to,
          requested: arguments[0],
          request: request,
          response: response
        });
        
        router.href(to, body, options);
        return this;
      },
      emit: function(type, value) {
        return emmitter.emit(type, value);
      },
      end: function() {
        if( finished ) return console.warn('[x-router] request \'' + request.href + '\' already finished.');
        finished = true;
        
        //router.exechash(req.hash, fire);
        router.fire('end', {
          fullhref: fullhref,
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
      fullhref: fullhref,
      href: parsed.fullpath,
      url: url,
      request: request,
      response: response
    });
    
    if( options.writestate !== false ) router.fire('changestate', {
      state: url,
      request: request,
      response: response
    });
    
    /*if( options.writestate !== false && options.replacestate !== true && options.redirect !== true ) {
      referer = parsed.fullpath;
    }*/
    
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
  var currentapp, apps = {}, listeners = {}, engines = {};
  
  var current = function(app) {
    if( !arguments.length ) return currentapp || apps['root'];
    currentapp = app;
    return this;
  };
  
  var get = function(name) {
    return apps[name || 'root'];
  }
  
  var href = function() {
    var app = current();
    if( !app ) return console.warn('[x-router] not yet initialized');
    return app.href.apply(app, arguments);
  };
  
  var reload = function() {
    var app = current();
    if( !app ) return console.warn('[x-router] not yet initialized');
    return app.reload.apply(app, arguments);
  };
  
  var referer = function() {
    var app = current();
    if( !app ) return console.warn('[x-router] not yet initialized');
    return app.referer.apply(app, arguments);
  };
  
  var state = function() {
    var app = current();
    if( !app ) return console.warn('[x-router] not yet initialized');
    return app.state.apply(app, arguments);
  };
  
  // @deprecated
  var laststate = function() {
    var app = current();
    if( !app ) return console.warn('[x-router] not yet initialized');
    return app.laststate.apply(app, arguments);
  };
  
  // @deprecated
  var lasthref = function() {
    var app = current();
    if( !app ) return console.warn('[x-router] not yet initialized');
    return app.lasthref.apply(app, arguments);
  };
  
  var history = function() {
    var app = current();
    if( !app ) return console.warn('[x-router] not yet initialized');
    return app.history.apply(app, arguments);
  };
  
  var emitter = function() {
    var app = current();
    if( !app ) return console.warn('[x-router] not yet initialized');
    return app.emitter();
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
  Application.get = get;
  Application.Router = Router;
  Application.current = current;
  Application.reload = reload;
  Application.href = href;
  Application.history = history;
  Application.referer = referer;
  Application.state = state;
  Application.engine = engine;
  Application.on = on;
  Application.once = once;
  Application.off = off;
  Application.fire = fire;
  Application.emitter = emitter;
  
  // @deprecated
  Application.lasthref = lasthref;
  Application.laststate = laststate;
})();

// add default rendering engine
Application.engine('default', function defaultRenderer(src, options, done) {
  var target = options.target;
  var render = function(err, contents) {
    if( err ) return done(err);
    if( typeof contents === 'string' ) contents = this.util.evalhtml(contents);
    else if( typeof contents !== 'object' ) return done(new TypeError('invalid type of src:' + typeof contents));
    else if( typeof contents.length !== 'number' ) contents = [contents];
    
    target.innerHTML = '';
    [].forEach.call(contents, function(node) {
      target.appendChild(node);
    });
    done();
  };
  
  if( typeof src === 'string' ) this.util.ajax(src, render);
  else render(null, src);
});

module.exports = Application;

// instantiate main routes && trigger
(function() {
  var mode = meta('mode') || (history.pushState ? 'pushstate' : 'hash');
  
  if( !~['pushstate', 'hash', 'none', 'auto'].indexOf(mode) ) {
    console.warn('[x-router] unsupported mode: ' + mode);
    mode = history.pushState ? 'pushstate' : 'hash';
  } else if( mode === 'auto' ) {
    mode = history.pushState ? 'pushstate' : 'hash';
  } else if( mode === 'pushstate' && !history.pushState ) {
    console.warn('[x-router] browser does not support `history.pushState`');
    mode = 'hash';
  }
  
  if( debug ) console.info('xrouter.mode', meta('mode'), mode);
  
  var app = function() {
    return Application.current();
  };
  
  var validatelocation = function(href) {
    href = href || '/';
    var base = app().base() || '';
    href = normalize(href).fullpath;
    if( !href.indexOf(base) ) return href.substring(base.length);
    return href;
  }
  
  if( mode === 'pushstate' ) {
    if( !history.pushState ) return console.error('[x-router] browser does not support \'history.pushState\'');
    
    var pushState = history.pushState;
    var replaceState = history.replaceState;
    var staterefs = {}, lastref, refseq = 0;
    
    history.pushState = function(body, title, href) {
      var seq = (refseq++) + '';
      staterefs[seq] = body;
      lastref = seq;
      pushState.call(history, seq, null, href);
      
      Application.href(validatelocation(location.href), body);
    };
    
    history.replaceState = function(body, title, href) {
      delete staterefs[lastref];
      var seq = (refseq++) + '';
      staterefs[seq] = body;
      lastref = seq;
      replaceState.call(history, seq, null, href);
      
      Application.href(validatelocation(location.href), body, {
        replacestate: true
      });
    };
    
    window.onpopstate = function(e) {
      var body = staterefs[e.state];
      delete staterefs[e.state];
      Application.href(validatelocation(location.href), body, {pop:true});
      
      app().fire('writestate', {
        href: validatelocation(location.href),
        body: body,
        push: false,
        replace: false,
        pop: true
      });
    };
    
    var push = function(href, body) {
      var seq = (refseq++) + '';
      staterefs[seq] = body;
      lastref = seq;
      pushState.call(history, seq, null, href);
      
      app().fire('writestate', {
        href: href,
        body: body,
        push: true,
        replace: false,
        pop: false
      });
    };
    
    var replace = function(href, body) {
      delete staterefs[lastref];
      var seq = (refseq++) + '';
      staterefs[seq] = body;
      lastref = seq;
      replaceState.call(history, seq, null, href);
      
      app().fire('writestate', {
        href: href,
        body: body,
        push: false,
        replace: true,
        pop: false
      });
    };
    
    Application.on('replace', function(e) {
      if( app() !== e.app ) return;
      var o = e.detail.request.options;
      if( o.pop || o.writestate === false ) return;
      var href = path.join(e.app.base(), e.detail.replaced);
      replace(href, e.detail.request.body);
    });
    
    Application.on('request', function(e) {
      if( app() !== e.app ) return;
      var href = e.detail.fullhref;
      var body = e.detail.request.body;
      var o = e.detail.request.options;
      if( o.pop || o.writestate === false ) return;
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
      
      app().fire('writestate', {
        href: url,
        body: body,
        push: false,
        replace: true,
        pop: false
      });
    };
    
    var push = function(url, body) {
      lasturl = url;
      location.assign('#' + url);
      
      app().fire('writestate', {
        href: url,
        body: body,
        push: true,
        replace: false,
        pop: false
      });
    };
    
    Application.on('replace', function(e) {
      if( app() !== e.app ) return;
      var o = e.detail.request.options;
      if( o.pop || o.writestate === false ) return;
      var href = path.join(e.app.base(), e.detail.replaced);
      replace(href, e.detail.request.body);
    });
    
    Application.on('request', function(e) {
      if( app() !== e.app ) return;
      var url = e.detail.fullhref;
      var body = e.detail.request.body;
      var o = e.detail.request.options;
      if( o.pop || o.writestate === false ) return;
      if( o.replacestate || o.redirect ) replace(url, body);
      else push(url, body);
    });
  }
  
  if( !window.xrouter ) {
    var isExternal = function(href) {
      var p = href.indexOf(':'), s = href.indexOf('/');
      return (~p && p < s) || href.indexOf('//') === 0 || href.toLowerCase().indexOf('javascript:') === 0;
    };
    
    var observer;
    function bootup() {
      function routify(a) {
        if( !a.__xrouter_scan__ ) {
          a.__xrouter_scan__ = true;
        
          a.onroute = null;
          a.onrouteresponse = null;
          a.onrouterequest = null;
        
          a.onclick = function(e) {
            var name = a.getAttribute('data-route') || a.getAttribute('route') || a.getAttribute('routes');
            var ghost = a.hasAttribute('data-ghost') || a.hasAttribute('ghost');
            var href = a.getAttribute('data-href') || a.getAttribute('href') || '';
            
            if( isExternal(href) ) return;
            e.preventDefault();
            
            var router = name ? Application.get(name) : (function() {
              var parent = a;
              while(parent) {
                if( parent.xrouter ) return parent.xrouter;
                parent = parent.parentNode;
              }
            })() || Application.current();
            
            if( !router ) return console.error('[x-router] router not found: ' + (name || '(root)'));
            
            if( href ) router.href(href, {
              srcElement: a
            }, {
              writestate: ghost ? false : true
            });
            return false;
          };
        }
        return this;
      }
      
      function scan() {
        [].forEach.call(document.querySelectorAll(ROUTE_SELECTOR), routify);
        return this;
      }
      
      scan();
      
      if( app() ) {
        if( mode === 'hash' ) Application.href(validatelocation(location.hash.substring(1)));
        else if( mode === 'pushstate') Application.href(validatelocation(location.href));
      }
      
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
                  if( node.querySelectorAll ) [].forEach.call(node.querySelectorAll(ROUTE_SELECTOR), routify);
                }
              });
            });
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        } else {
          window.setInterval(scan, +meta('observe.delay') || 1000);
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
      console.warn('[x-router] window.route() is deprecated(will be removed in 0.4.x), use window.xrouter.href()');
      var current = app();
      current.href.apply(current, arguments);
    };
  
    window.xrouter = Application;
  }
})();

