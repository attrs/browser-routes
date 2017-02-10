module.exports = function(app, ctx) {
  if( typeof history == 'object' && history && history.pushState )
    return require('./pushstate.js')(app, ctx);
  
  return require('./hash.js')('!')(app, ctx);
};