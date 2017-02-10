var tinyevent = require('tinyevent');
var meta = require('../meta.js');
var debug = meta('debug') === 'true' ? true : false;
var defmode = meta('mode');

var apps = [];
var instances = [];
var chref;

var Connector = module.exports = {};
var dispatcher = tinyevent(Connector);

Connector.types = {
  pushstate: require('./pushstate.js'),
  hashbang: require('./hash.js')('!'),
  hash: require('./hash.js')(),
  auto: require('./auto.js')
};

Connector.href = function(href, body, options) {
  if( !arguments.length ) return chref;
  
  var args = arguments;
  apps.forEach(function(app) {
    app.href.apply(app, args);
  });
  
  return this;
};

Connector.refresh = function(statebase) {
  var args = arguments;
  apps.forEach(function(app) {
    app.refresh.apply(app, args);
  });
  
  return this;
};

Connector.instances = function() {
  return apps.slice();
};

Connector.connect = function(app, options) {
  if( !app ) return console.error('missing argument:app');
  if( ~apps.indexOf(app) ) return console.error('already listening', app.id);
  
  options = options || {};
  var mode = options.mode || defmode || 'auto';
  
  if( debug ) console.debug('[x-router] mode:', mode);
  var ConnectorType = this.types[mode];
  if( !ConnectorType ) {
    console.warn('[x-router] unsupported mode: ', mode);
    ConnectorType = this.types['auto'];
  }
  
  var connector = ConnectorType(app, Connector);
  apps.push(app);
  instances.push(connector);
  return connector;
};

Connector.disconnect = function(app) {
  var pos = apps.indexOf(app);
  if( ~pos ) {
    instances[pos].disconnect();
    instances.splice(pos, 1);
  }
  if( ~pos ) apps.splice(pos, 1);
  return this;
};

Connector.on = function(type, fn) {
  dispatcher.on(type, fn);
  return this;
};

Connector.once = function(type, fn) {
  dispatcher.once(type, fn);
  return this;
};

Connector.off = function(type, fn) {
  dispatcher.off(type, fn);
  return this;
};

Connector.fire = function(type, detail) {
  if( type === 'writestate' ) chref = detail.href;
  dispatcher.fire(type, detail);
  return this;
};
