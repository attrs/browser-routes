var URL = require('url');
var domready = require('../domready.js');

var stateseq = 0;
function genstateseq(app) {
  stateseq = stateseq + 1;
  return app.id + ':' + stateseq;
}

function chref() {
  return URL.parse(location.href).path;
}

module.exports = function(app, ctx) {
  if( typeof history !== 'object' && !(history && history.pushState) ) return console.error('[x-router] browser does not support \'history.pushState\'');
  
  var staterefs = {}, laststateid, empty = {};
  
  var pathbar_popstate = function(e) {
    //console.debug('pop', e.state, staterefs[e.state], chref());
    if( !(e.state in staterefs) ) return;
    var state = staterefs[e.state];
    var body = state.body;
    if( body === empty ) body = null;
    
    app.href(chref(), body, {pop:true});
  };
  
  var pathbar_writestate = function(e) {
    ctx && ctx.fire('writestate', e.detail);
    if( e.detail.pop ) return;
    
    if( e.detail.replace ) {
      //delete staterefs[laststateid];
      var stateid = laststateid = genstateseq(app);
      staterefs[stateid] = e.detail.body || empty;
      
      //console.debug('replace', stateid, e.detail.href);
      history.replaceState(stateid, null, e.detail.href);
    } else {
      var stateid = laststateid = genstateseq(app);
      staterefs[stateid] = e.detail.body || empty;
      
      // TODO: 현재의 브라우저 경로와 같은 href 라면 replaceState 를 하는게 맞을지.
      
      //console.debug('push', stateid, e.detail.href);
      history.pushState(stateid, null, e.detail.href);
    }
  };
  
  window.addEventListener('popstate', pathbar_popstate);
  app.on('writestate', pathbar_writestate);
  
  domready(function() {
    app.href(chref());
  });
  
  return {
    disconnect: function() {
      document.removeEventListener('popstate', pathbar_popstate);
      app.off('writestate', pathbar_writestate);
    }
  }
};
