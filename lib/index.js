var xrouter = module.exports = require('./app.js');
xrouter.initiator.add(require('./initiator/render.js'));
xrouter.initiator.add(require('./initiator/redirect.js'));

xrouter.href = function() {
  return xrouter.connector.href.apply(xrouter.connector, arguments);
};

xrouter.get = function(id) {
  if( !id ) return null;
  if( typeof id == 'string' ) return xrouter.apps.get(id);
  
  id = id[0] || id;
  if( id.parentNode ) return (function() {
    while(id) {
      if( id.xrouter ) return id.xrouter;
      id = id.parentNode;
    }
  })();
};

if( typeof window === 'object' ) {
  xrouter.scanner = require('./scanner.js').start();
  window.xrouter = xrouter;
}