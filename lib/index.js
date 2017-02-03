var xrouter = module.exports = require('./app.js');
xrouter.initiator.add(require('./initiator/render.js'));
xrouter.initiator.add(require('./initiator/redirect.js'));

xrouter.href = function() {
  return xrouter.connector.href.apply(xrouter.connector, arguments);
};

// browser only
if( typeof window === 'object' ) {
  var closest = function(el, selector) {
    var matches = (window.document || window.ownerDocument).querySelectorAll(selector), i;
    do {
      i = matches.length;
      while (--i >= 0 && matches.item(i) !== el) {};
    } while ((i < 0) && (el = el.parentElement)); 
    return el;
  };
  
  // @deprecated
  xrouter.get = function(id, axis) {
    console.warn('[x-router] xrouter.get is deprecated, use xrouter.find instead');
    
    var node = xrouter.find(id, axis);
    return node && node.xrouter;
  };
  
  xrouter.find = function(id, axis) {
    if( !id ) return null;
    if( typeof id == 'string' ) {
      var selector = '[data-xrouter-id="' + id + '"]';
      var matched;
        
      if( axis && axis.nodeType === 1 ) {
        if( axis.closest ) matched = axis.closest(selector);
        else matched = closest(axis, selector);
      }
      
      matched = matched || (window.document || window.ownerDocument).querySelector(selector);
      
      return matched;
    }
    
    var node = id[0] || id;
    if( node.parentNode ) return (function() {
      while( node ) {
        if( node.xrouter ) return node;
        node = node.parentNode;
      }
    })();
  };
  
  xrouter.scanner = require('./scanner.js').start();
  window.xrouter = xrouter;
}