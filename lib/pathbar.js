var meta = require('./meta.js');
var normalize = require('./normalize.js');
var debug = meta('debug') === 'true' ? true : false;

var mode = meta('mode') || (history.pushState ? 'pushstate' : 'hash');
var app;

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

var validatelocation = function(href) {
  href = href || '/';
  var app = app();
  if( !app ) return console.warn('[x-router] router not yet initialized');
  var base = app.base() || '';
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
  
  app.on('replace', function(e) {
    if( app() !== e.app ) return;
    var o = e.detail.request.options;
    if( o.pop || o.writestate === false ) return;
    var href = path.join(e.app.base(), e.detail.replaced);
    replace(href, e.detail.request.body);
  });
  
  app.on('request', function(e) {
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
  
  app.on('replace', function(e) {
    if( app() !== e.app ) return;
    var o = e.detail.request.options;
    if( o.pop || o.writestate === false ) return;
    var href = path.join(e.app.base(), e.detail.replaced);
    replace(href, e.detail.request.body);
  });
  
  app.on('request', function(e) {
    if( app() !== e.app ) return;
    var url = e.detail.fullhref;
    var body = e.detail.request.body;
    var o = e.detail.request.options;
    if( o.pop || o.writestate === false ) return;
    if( o.replacestate || o.redirect ) replace(url, body);
    else push(url, body);
  });
}

if( app ) {
  if( mode === 'hash' ) app.href(validatelocation(location.hash.substring(1)));
  else if( mode === 'pushstate') app.href(validatelocation(location.href));
}

module.exports = {
  listen: function(app, options) {
    
  },
  disconnect: function(app) {
    
  }
};
