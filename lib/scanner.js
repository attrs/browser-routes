var URL = require('url');
var meta = require('./meta.js');
var domready = require('./domready.js');
var xrouter = require('./app.js');
var connector = require('./connector/');
var ieversion = require('./ieversion.js');

var debug = meta('debug') === 'true' ? true : false;
var ROUTE_SELECTOR = '*[route], *[data-route], *[routes], *[data-routes]';
if( !document.head ) document.head = document.getElementsByTagName('head')[0];

function isExternal(href) {
  var p = href.indexOf(':'), s = href.indexOf('/');
  return (~p && p < s) || href.indexOf('//') === 0 || href.toLowerCase().indexOf('javascript:') === 0;
}

function routify(a) {
  if( !a.__xrouter_scan__ ) {
    a.__xrouter_scan__ = true;
    
    a.onroute = null;
    a.onrouteresponse = null;
    a.onrouterequest = null;
    
    a.onclick = function(e) {
      var name = a.getAttribute('data-route') || a.getAttribute('route') || a.getAttribute('data-routes') || a.getAttribute('routes');
      var href = a.getAttribute('data-href') || a.getAttribute('href');
      var ghost = a.getAttribute('data-ghost') || a.hasAttribute('ghost');
      var replace = a.getAttribute('data-replace') || a.hasAttribute('replace');
      var isroot = a.getAttribute('data-root') || a.hasAttribute('root');
      
      if( !href || isExternal(href) ) return;
      if( !ieversion || ieversion > 8 ) e.preventDefault();
      
      if( name === '$root' ) isroot = true;
      
      if( isroot ) {
        connector.href(href, {
          srcElement: a
        }, {
          writestate: ghost ? false : true,
          replace: replace
        });
        return false;
      }
      
      var scope = xrouter(a);
      
      if( !scope && name ) {
        console.error('[x-router] not found scope: ' + name);
      } else {
        (scope || connector).href(href, {
          srcElement: a
        }, {
          writestate: ghost ? false : true,
          replace: replace
        });
      }
      
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
    domready(bootup);
    return this;
  },
  scan: scan
};