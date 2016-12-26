var ajax = require('../../ajax.js');

module.exports = function DefaultRenderer(options, done) {
  var target = options.target;
  var src = options.src;
  var html = options.html;
  
  var render = function(err, html) {
    if( err ) return done(err);
    if( typeof html === 'object' && html.html ) html = html.html;
    if( typeof html !== 'string' ) return done(new Error('html must be a string'));
    
    target.innerHTML = html;
    done();
  };
  
  if( src ) ajax(src, render);
  else if( html ) render(null, html);
  else done(new Error('missing src or html'));
};
