var path = require('path');

module.exports = function() {
  return function(request, response, next) {
    var app = request.app;
    
    response.redirect = function(to, body, options) {
      response.end();
      options = options || {};
      options.redirect = true;
      body = body || request.body || {};
      
      if( to[0] !== '#' && to[0] !== '/' ) {
        to = path.resolve(path.join(request.parentURL, request.url), to);
      }
      
      app.fire('redirect', {
        fullhref: fullhref,
        href: parsed.fullpath,
        options: options,
        referer: referer,
        url: request.currentURL,
        to: to,
        requested: arguments[0],
        request: request,
        response: response
      });
      
      app.href(to, body, options);
      return this;
    };
    
    next();
  };
};
