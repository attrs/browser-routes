var path = require('path');
var URL = require('url');
var Router = require('tinyrouter');
var meta = require('./meta.js');
var pathbar = require('./pathbar.js');
var middlewares = [];

function abs(curl, url) {
  if( !url ) return '/';
  if( url[0] === '/' ) return url;
  
  var url = URL.parse(url).path;
  if( url[0] !== '/' ) url = '/' + url;
  
  if( !curl ) return url;
  var cdir = path.dirname(curl + 'a');
  if( cdir === '/' ) cdir = '';
  return cdir + url;
}

/*
console.log('http://localhost:9000/a/b/c?a=b', abs(null, 'http://localhost:9000/a/b/c?a=b'));
console.log('/a/b/c?a=b', abs(null, '/a/b/c?a=b'));
console.log('/g/d /a/b/c?a=b', abs('/g/d', '/a/b/c?a=b'));
console.log('/g/d/ /a/b/c?a=b', abs('/g/d/', '/a/b/c?a=b'));
console.log('/g/d a/b/c?a=b', abs('/g/d', 'a/b/c?a=b'));
console.log('/g/d/ a/b/c?a=b', abs('/g/d/', 'a/b/c?a=b'));
*/

var apps = {};
function Application(id) {
  var router = Router(id),
    debug = meta('debug') === 'true' ? true : false,
    config = {},
    request,
    response,
    session = {},
    history = [],
    referer,
    currenthref;
    
  if( debug ) console.info('app created', id);
  if( id ) apps[id] = router;
  
  // add global middleware
  middlewares.forEach(function(middleware) {
    router.use(middleware.call(router));
  });
  
  // config
  router.debug = function(b) {
    if( !arguments.length ) return debug;
    debug = !!b;
    return this;
  };
  
  router.config = function(key, value) {
    if( arguments.length <= 1 ) return config[key];
    config[key] = value;
    return this;
  };
  
  router.session = function() {
    return session;
  };
  
  // history
  router.state = function(index) {
    index = +index || 0;
    return history[history.length - 1 + index];
  };
  
  router.history = function() {
    return history;
  };
  
  router.referer = function() {
    return referer;
  };
  
  // href
  router.app = function(request, response) {
    var resconfig = {};
    var finished = false;
    var app = {
      request: {
        requesthref: request.requesthref,
        method: request.method || 'get',
        referer: request.referer,
        fullhref: request.href,
        href: request.href,
        url: request.url,
        session: session,
        options: request.options,
        body: request.body,
      },
      response: {
        config: function(key, value) {
          if( !arguments.length ) return resconfig;
          if( arguments.length === 1 ) return resconfig[key];
          if( value === null || value === undefined ) delete resconfig[key];
          else resconfig[key] = value;
          return this;
        },
        end: function() {
          if( finished ) return console.warn('[x-router] request \'' + request.href + '\' already finished.');
          finished = true;
          
          router.fire('end', {
            url: request.url,
            href: request.href,
            request: request,
            response: response
          });
        }
      }
    };
    
    if( debug ) console.info('app build', router.id, app);
    return app;
  };
  
  router.href = function(requesthref, body, options) {
    if( !arguments.length ) return currenthref;
    if( typeof body === 'boolean' ) options = {writestate:body}, body = null;
    if( typeof options === 'boolean' ) options = {writestate:options};
    if( !options || typeof options !== 'object' ) options = {};
    if( !requesthref ) return console.error('[x-router] missing url');
    if( typeof requesthref === 'number' ) url = url + '';
    if( typeof requesthref !== 'string' ) return console.error('[x-router] illegal type of url');
    
    var href = abs(router.state(), requesthref);
    var body = body;
    var force = options.force === true ? true : false;
    var writestate = options.writestate === false ? false : true;
    var replace = options.replace === true ? true : false;
    
    if( !writestate ) force = true;
    if( router.config('always') === true ) force = true;
    
    if( debug ) console.info('href', requesthref, {
      currenthref: currenthref,
      href: href,
      force: force,
      writestate: writestate,
      prevstate: router.state()
    });
    
    if( !force && currenthref === href ) return;
    
    var prepared = router.app({
      requesthref: requesthref,
      referer: currenthref,
      href: href,
      url: href,
      options: options,
      body: body
    });
    
    var request = prepared.request;
    var response = prepared.response;
    
    if( router.fire('beforerequest', {
      href: href,
      request: request,
      response: response
    }) ) {
      if( writestate ) {
        history.push(href);
        if( history.length > 30 ) history = history.slice(history.length - 30);
        
        //console.error('pushstate', router.id, href);
        router.fire('pushstate', {
          href: href,
          replace: replace,
          request: request,
          response: response
        });
      }
      
      router(request, response);
      currenthref = href;
      
      router.fire('request', {
        href: href,
        request: request,
        response: response
      });
    } else if( debug ) {
      console.info('[x-router] beforerequest event prevented');
    }
    
    return this;
  };
  
  router.refresh = function(statebase) {
    statebase = statebase === false ? false : true;
    
    if( !statebase ) {
      if( currenthref ) return router.href(currenthref, null, {force: true});
      return;
    }
    
    var state = router.state();
    if( state ) return router.href(state, null, {force: true});
  };
  
  router.on('replace', function(e) {
    if( debug ) console.info('[x-router] route replaced', e.detail);
    
    var request = e.detail.request;
    if( request.options.writestate !== false ) {
      history[history.length - 1] = e.detail.href;
      
      router.fire('replacestate', {
        href: e.detail.href,
        request: request,
        response: e.detail.response
      });
    }
  });
  
  router.listen = function(options) {
    pathbar.connect(router, options);
    return this;
  };
  
  router.close = function() {
    pathbar.disconnect(router);
    return this;
  };
  
  return router;
};

Application.pathbar = pathbar;
Application.Router = Router;
Application.middleware = {
  add: function(fn) {
    middlewares.push(fn);
    return this;
  },
  remove: function(fn) {
    if( ~middlewares.indexOf(fn) ) middlewares.splice(middlewares.indexOf(fn), 1);
    return this;
  },
  list: function() {
    return middlewares;
  }
};
Application.apps = {
  names: function() {
    return Object.keys(apps);
  },
  get: function(name) {
    return apps[name];
  }
};

module.exports = Application;