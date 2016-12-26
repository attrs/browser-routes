var path = require('path');

module.exports = function() {
  var engines = {
    default: require('./renderer/default.js')
  };
  
  this.engine = function(name, fn) {
    if( arguments.length === 1 ) return engines[name];
    engines[name] = fn;
    return this;
  };
  
  return function(request, response, next) {
    var app = request.app;
    response.render = function(src, options, odone) {
      if( arguments.length == 2 && typeof options === 'function' ) odone = options, options = null;
      
      var done = function(err, result) {
        if( err ) return odone ? odone.call(this, err) : console.error(err);
        var oarg = [].slice.call(arguments, 1);
        var arg = [null, target];
        if( odone ) odone.apply(this, arg.concat(oarg));
      };
    
      var o = {};
      var engine;
    
      if( !src ) {
        return done(new Error('missing src'));
      } if( typeof src === 'string' ) {
        var extname = path.extname(src).substring(1).toLowerCase();
        var defenginename = response.config('view engine') || app.config('view engine') || 'default';
        var enginename = (options && options.engine) || extname || defenginename;
        var base = response.config('views') || app.config('views') || '/';
        
        engine = app.engine(enginename) || app.engine(defenginename);
        if( !engine ) return done(new Error('not exists engine: ' + enginename));
        
        if( !(~src.indexOf('://') || src.indexOf('//') === 0) ) {
          if( src.trim()[0] === '/' ) src = '.' + src;
          o.src = path.join(base, src);
        } else {
          o.src = src;
        }
      } else if( typeof src === 'object' ) {
        var defenginename = response.config('view engine') || app.config('view engine') || 'default';
        var enginename = (options && options.engine) || (function() {
          for(var k in src) {
            if( app.engine(k) ) return k;
          }
        })();
        
        engine = app.engine(enginename) || app.engine(defenginename);
        if( !engine ) return done(new Error('not exists engine: ' + enginename));
        
        o.html = src[enginename || 'html'];
      } else {
        return done(new Error('illegal type of src: ' + typeof src));
      }
      
      if( !options ) options = {};
      if( typeof options === 'string' ) options = {target:options};
      if( typeof options !== 'object' ) return done(new TypeError('options must be an object or string(target)'));
      
      for(var k in options) o[k] = options[k];
      
      var target = o.target || response.config('view target') || app.config('view target');
      if( typeof target === 'string' ) target = document.querySelector(target);
      if( !target ) return done(new Error('view target not found: ' + (o.target || response.config('view target') || app.config('view target'))));
      o.target = target;
      
      if( app.fire('beforerender', {
        fullhref: fullhref,
        href: request.href,
        options: o,
        src: src,
        target: target,
        url: request.url,
        request: request,
        response: response
      }) ) {
        engine.call(app, o, function(err) {
          if( err ) return done(err);
          
          app.fire('render', {
            fullhref: fullhref,
            href: request.href,
            options: o,
            src: src,
            target: target,
            url: request.url,
            request: request,
            response: response
          });
          
          target.xrouter = app;
          done.apply(this, arguments);
        });
      }
      
      return this;
    };
    
    response.render.html = function(html, options, done) {
      if( typeof html !== 'string' ) return done && done(new Error('html must be a string'));
      
      html = {html: html};
      render.apply(this, arguments);
      return this;
    };
    
    next();
  };
};