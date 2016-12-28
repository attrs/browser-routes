var domready = require('../domready.js');

function chref(n) {
  return location.hash.substring(n) || '/';
}

module.exports = function(prefix) {
  prefix = '#' + (prefix || '');
  var n = prefix.length;
  
  return function(app) {
    var hashchangelistener = function() {
      if( location.hash.startsWith(prefix + '/') ) app.href(chref(n));
    };
  
    if( window.addEventListener ) window.addEventListener('hashchange', hashchangelistener);
    else window.attachEvent('hashchange', hashchangelistener);
  
    var writestatelistener = function(e) {
      if( e.detail.pop ) return;
      
      var href = e.detail.href;
      if( e.detail.replace ) {
        location.replace(prefix + href);
      } else {
        location.assign(prefix + href);
      }
    };
  
    app.on('writestate', writestatelistener);
  
    domready(function() {
      if( location.hash.startsWith(prefix + '/') ) app.href(chref(n));
      else app.href('/');
    });
  
    return {
      disconnect: function(app) {
        if( window.addEventListener ) window.removeEventListener('hashchange', hashchangelistener);
        else window.detachEvent('hashchange', hashchangelistener);
        app.off('writestate', writestatelistener);
      }
    }
  };
};