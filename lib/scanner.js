var meta = require('./meta.js');
var app = require('./app.js');
var ieversion = require('./ieversion.js');
var debug = meta('debug') === 'true' ? true : false;
var ROUTE_SELECTOR = '*[route], *[data-route], *[routes], *[data-routes]';

function isExternal(href) {
  var p = href.indexOf(':'), s = href.indexOf('/');
  return (~p && p < s) || href.indexOf('//') === 0 || href.toLowerCase().indexOf('javascript:') === 0;
};

function routify(a) {
  if( !a.__xrouter_scan__ ) {
    a.__xrouter_scan__ = true;
    
    a.onroute = null;
    a.onrouteresponse = null;
    a.onrouterequest = null;
    
    a.onclick = function(e) {
      var name = a.getAttribute('data-route') || a.getAttribute('route');
      var ghost = a.hasAttribute('data-ghost') || a.hasAttribute('ghost');
      var href = a.getAttribute('data-href') || a.getAttribute('href') || '';
      
      if( isExternal(href) ) return;
      if( !ieversion || ieversion > 8 ) e.preventDefault();
      
      var router = name ? app.get(name) : ((function() {
        var parent = a;
        while(parent) {
          if( parent.xrouter ) return parent.xrouter;
          parent = parent.parentNode;
        }
      })() || app.apps[0]);
      
      if( !router ) {
        if( name ) console.error('[x-router] router not found: ' + name);
        else console.error('[x-router] router not yet initialized');
        return;
      }
      
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

var observer;
function bootup() {
  scan();
  
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

module.exports = {
  start: function() {
    if( document.body ) bootup();
    else {
      if( document.addEventListener ) {
        document.addEventListener('DOMContentLoaded', function() {
          window.setTimeout(bootup, 1);
        });
      } else if( document.attachEvent ) {
        document.attachEvent('onreadystatechange', function () {
          if( document.readyState === 'complete' ) window.setTimeout(bootup, 1);
        });
      }
    };
  },
  scan: scan
};