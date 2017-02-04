var path = require('path');
var ajax = require('tinyajax');

function DefaultRenderer(options, done) {
  var target = options.target;
  var src = options.src;
  var html = options.html;
  
  var render = function(err, html) {
    if( err ) return done(err);
    if( typeof html === 'object' && html.html ) html = html.html;
    if( typeof html !== 'string' ) return done(new Error('html must be a string'));
    
    target.innerHTML = html;
    done();
  };
  
  if( src ) ajax(src, render);
  else if( html ) render(null, html);
  else done(new Error('missing src or html'));
};


module.exports = function() {
  var engines = {
    default: DefaultRenderer
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
          if( src[0] === '/' ) src = '.' + src;
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
        
        o.html = src.html;
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
      o.request = request;
      o.response = response;
      
      if( app.fire('beforerender', {
        href: request.href,
        options: o,
        src: src,
        target: target,
        url: request.url,
        request: request,
        response: response
      }) ) {
        setTimeout(function() {
          engine.call(app, o, function(err) {
            if( err ) return done(err);
            
            app.fire('render', {
              href: request.href,
              options: o,
              src: src,
              target: target,
              url: request.url,
              request: request,
              response: response
            });
            
            if( app.id ) target.setAttribute('data-xrouter-id', app.id + '');
            
            target.xrouter = app;
            target.xrouter_rendered_base = request.parentURL;
            
            done.apply(this, arguments);
            if( willbeend ) response.end();
          });
        }, 1);
      }
    
      var willbeend = false;
      return {
        end: function() {
          willbeend = true;
        }
      };
    };
    
    response.render.html = function(html, options, done) {
      if( typeof html !== 'string' ) return done && done(new Error('html must be a string'));
      
      html = {html: html};
      return response.render.apply(this, arguments);
    };
    
    next();
  };
};