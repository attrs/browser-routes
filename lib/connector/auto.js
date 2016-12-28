module.exports = function(app) {
  if( typeof history == 'object' && history && history.pushState )
    return require('./pushstate.js')(app);
  
  return require('./hash.js')('!')(app);
};