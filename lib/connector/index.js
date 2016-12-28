var meta = require('../meta.js');
var debug = meta('debug') === 'true' ? true : false;
var defmode = meta('mode');

var apps = [];
var instances = [];

module.exports = {
  connectors: {
    pushstate: require('./pushstate.js'),
    hashbang: require('./hash.js')('!'),
    hash: require('./hash.js')(),
    auto: require('./auto.js')
  },
  href: function(href, body, options) {
    var args = arguments;
    apps.forEach(function(app) {
      app.href.apply(app, args);
    });
    
    return this;
  },
  instances: function() {
    return apps.slice();
  },
  connect: function(app, options) {
    if( !app ) return console.error('missing argument:app');
    if( ~apps.indexOf(app) ) return console.error('already listening', app.id);
    
    options = options || {};
    var mode = options.mode || defmode || 'auto';
    
    if( debug ) console.debug('[x-router] mode:', mode);
    var Connector = this.connectors[mode];
    if( !Connector ) {
      console.warn('[x-router] unsupported mode: ', mode);
      Connector = this.connectors['auto'];
    }
    
    var connector = Connector(app);
    apps.push(app);
    instances.push(connector);
    return connector;
  },
  disconnect: function(app) {
    var pos = apps.indexOf(app);
    if( ~pos ) apps.splice(pos, 1);
    if( ~pos ) instances.splice(pos, 1);
    return this;
  }
};
