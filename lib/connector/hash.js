var domready = require('../domready.js');

function chref(n) {
  return location.hash.substring(n) || '/';
}

module.exports = function(prefix) {
  prefix = '#' + (prefix || '');
  var n = prefix.length;
  
  return function(app, ctx) {
    var lasthref;
    var hashchangelistener = function() {
      var href = chref(n);
      if( location.hash.startsWith(prefix + '/') && lasthref !== href ) app.href(href);
    };
    
    if( window.addEventListener ) window.addEventListener('hashchange', hashchangelistener);
    else window.attachEvent('hashchange', hashchangelistener);
    
    var writestatelistener = function(e) {
      ctx && ctx.fire('writestate', e.detail);
      if( e.detail.pop ) return;
      
      var href = prefix + e.detail.href;
      if( href === lasthref ) return;
      
      lasthref = e.detail.href;
      if( e.detail.replace ) {
        location.replace(href);
      } else {
        location.assign(href);
      }
    };
    
    app.on('writestate', writestatelistener);
    
    domready(function() {
      if( location.hash.startsWith(prefix + '/') ) app.href(chref(n));
      else app.href('/');
    });
    
    return {
      disconnect: function() {
        if( window.addEventListener ) window.removeEventListener('hashchange', hashchangelistener);
        else window.detachEvent('hashchange', hashchangelistener);
        app.off('writestate', writestatelistener);
      }
    }
  };
};