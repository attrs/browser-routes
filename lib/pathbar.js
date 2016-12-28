var URL = require('url');
var meta = require('./meta.js');
var debug = meta('debug') === 'true' ? true : false;
var defmode = meta('mode') || (history.pushState ? 'pushstate' : 'hashbang');
var apps = [];

var stateseq = 0;
function genstateseq(app) {
  stateseq = stateseq + 1;
  return app.id + ':' + stateseq;
}

function chref() {
  return URL.parse(location.href).path;
}

module.exports = {
  href: function(href, body, options) {
    var args = arguments;
    apps.forEach(function(app) {
      app.href.apply(app, args);
    });
    
    return this;
  },
  connect: function(app, options) {
    if( !app ) return console.error('missing argument:app');
    if( ~apps.indexOf(app) ) return console.error('already listening', app.id);
    
    options = options || {};
    apps.push(app);
    
    var mode = options.mode || defmode;
    
    if( !~['pushstate', 'hash', 'hashbang', 'auto'].indexOf(mode) ) {
      console.warn('[x-router] unsupported mode: ' + mode);
      mode = 'auto';
    }
    
    if( mode === 'auto' ) {
      mode = history.pushState ? 'pushstate' : 'hashbang';
    }
    
    if( mode === 'pushstate' && !history.pushState ) {
      console.warn('[x-router] browser does not support `history.pushState`');
      mode = 'hashbang';
    }
    
    if( debug ) console.info('xrouter.mode', meta('mode'), mode);
    
    if( mode === 'pushstate' ) {
      if( !history.pushState ) return console.error('[x-router] browser does not support \'history.pushState\'');
      
      var staterefs = {}, laststateid, empty = {};
      
      app.__pathbar_popstate__ = function(e) {
        //console.debug('pop', e.state, staterefs[e.state], chref());
        if( !(e.state in staterefs) ) return;
        var state = staterefs[e.state];
        var body = state.body;
        if( body === empty ) body = null;
        
        app.href(chref(), body, {pop:true});
      };
      
      app.__pathbar_writestate__ = function(e) {
        if( e.detail.pop ) return;
        
        if( e.detail.replace ) {
          //delete staterefs[laststateid];
          var stateid = laststateid = genstateseq(app);
          staterefs[stateid] = e.detail.body || empty;
          
          //console.debug('replace', stateid, e.detail.href);
          history.replaceState(stateid, null, e.detail.href);
        } else {
          var stateid = laststateid = genstateseq(app);
          staterefs[stateid] = e.detail.body || empty;
          
          // TODO: 현재의 브라우저 경로와 같은 href 라면 replaceState 를 하는게 맞을지.
          
          //console.debug('push', stateid, e.detail.href);
          history.pushState(stateid, null, e.detail.href);
        }
      };
      
      window.addEventListener('popstate', app.__pathbar_popstate__);
      app.on('writestate', app.__pathbar_writestate__);
    }
    
    var fire = function() {
      if( mode === 'pushstate') app.href(chref());
      else if( mode === 'hashbang' ) app.href(location.hash.substring(2));
      else if( mode === 'hash' ) app.href(location.hash.substring(1));
    };
    
    if( document.body ) {
      fire();
    } else {
      if( document.addEventListener ) {
        document.addEventListener('DOMContentLoaded', function() {
          window.setTimeout(fire, 1);
        });
      } else if( document.attachEvent ) {
        document.attachEvent('onreadystatechange', function () {
          if( document.readyState === 'complete' ) window.setTimeout(fire, 1);
        });
      }
    }
    
    return this;
  },
  disconnect: function(app) {
    if( ~apps.indexOf(app) ) apps.splice(apps.indexOf(app), 1);
    document.removeEventListener('popstate', app.__pathbar_popstate__);
    app.off('writestate', app.__pathbar_writestate__);
    
    return this;
  }
};
