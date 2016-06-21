/*!
* browser-routes v0.0.4
* https://github.com/attrs/browser-routes
*
* Copyright attrs and others
* Released under the MIT license
* https://github.com/attrs/browser-routes/blob/master/LICENSE
*
* Date: Wed Jun 22 2016 00:59:42 GMT+0900 (KST)
*/
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("Routes", [], factory);
	else if(typeof exports === 'object')
		exports["Routes"] = factory();
	else
		root["Routes"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var path = __webpack_require__(1);
	
	function normalize(url, doc) {
	  if( !url || typeof url !== 'string' ) throw new TypeError('illegal url');
	  var a = (doc || document).createElement('a');
	  a.href = url;
	  return {
	    href: a.href,
	    protocol: a.protocol,
	    hostname: a.hostname,
	    port: a.port,
	    pathname: a.pathname,
	    fullpath: a.pathname + (a.search ? a.search : '') + (a.hash ? a.hash : ''),
	    search: a.search,
	    hash: a.hash,
	    host: a.host
	  };
	}
	
	function config(name, alt) {
	  var root = document.head.querySelector('meta[name="' + name + '"][content]');
	  return (root && root.getAttribute('content')) || alt;
	}
	
	function current(mode) {
	  if( mode === 'hash' ) {
	    return location.hash;
	  }
	
	  return location.href;
	}
	
	function endsWith(str, word) {
	  var i = str.toLowerCase().indexOf(word);
	  return i > 0 && i === str.length - word.length;
	}
	
	function parseQuery(query) {
	  query = query.trim();
	  if( query[0] === '?' ) query = query.substring(1);
	  var match,
	      pl     = /\+/g,
	      search = /([^&=]+)=?([^&]*)/g,
	      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };
	      
	  var params = {};
	  while (match = search.exec(query)) {
	    var key = decode(match[1]);
	    var value = decode(match[2]);
	    if( Array.isArray(params[key]) ) params[key].push(value);
	    else if( params[key] ) (params[key] = [params[key]]).push(value);
	    else params[key] = value;
	  }
	  return params;
	}
	
	function defaultChecker() {
	  var tag = document.currentScript || document._currentScript;
	  return function() {
	    return tag && tag.ownerDocument && tag.ownerDocument.documentElement && tag.ownerDocument.documentElement.contains(tag);
	  };
	}
	
	function addEventListener(scope, type, fn, bubble) { 
	  if( scope.attachEvent ) scope.attachEvent(type,fn); 
	  else scope.addEventListener(type,fn,bubble);
	}
	
	function match(requri, uri) {
	  //TODO: fix regexp matching
	  return requri === uri;
	}
	
	function capture(o) {
	  return JSON.parse(JSON.stringify(o));
	}
	
	function chain(scope, req, res, routes, next) {
	  var i = 0, forward;
	  return forward = function(err) {
	    var route = routes[i++];
	    if( err || !route ) return next(err);
	    
	    var uri = route.uri;
	    var type = route.type;
	    var fn = route.fn;
	    
	    //console.log('current', uri, type, fn);
	    if( type === 'use' && uri ) {
	      if( uri && uri.trim() === '/' ) uri = '';
	      
	      var opurl = req.purl || '';
	      var ourl = req.url;
	      req.purl = path.join(opurl, ourl.substring(0, uri.length));
	      req.url = ourl.substring(uri.length) || '/';
	      
	      //console.log('routing', uri, ourl, req.purl, req.url);
	      
	      fn.apply(scope, [req, res, forward]);
	      req.purl = opurl;
	      req.url = ourl;
	    } else {
	      fn.apply(scope, [req, res, forward]);
	    }
	  };
	}
	
	function redirector(uri) {
	  return function redirector(req, res, next) {
	    res.redirect(uri);
	  };
	}
	
	
	// factory Router
	function Router(name) {
	  name = name || 'unknwon';
	  var boot = true;
	  var routes = [];
	  var listeners = {};
	  
	  var body = function Router(req, res, next) {
	    next = next || function() {};
	    
	    //console.log('body', req.baseUrl, req.url);
	    var fns = [];
	    routes.forEach(function(route) {
	      //console.log('[' + name + '] route', route);
	      if( !boot && route.boot ) return;
	      if( route.type === 'use' ) {
	        if( route.uri === '/' || !req.url.indexOf(route.uri) || match(req.url, route.uri) ) return fns.push(route);
	      } else if( route.type === 'get' ) {
	        //console.log(name, req.url || '(no)', route.uri || '(no)');
	        if( match(req.url, route.uri) ) return fns.push(route);
	      }
	    });
	    
	    /*console.info('[' + name + '] fns', req.url, fns.map(function(o) {
	      return (o.uri || 'any') + '(' + (o.fn.name || 'unnamed') + ')';
	    }));*/
	    
	    req.boot = boot;
	    chain(body, req, res, fns, next)(req.error);
	    boot = false;
	  };
	  
	  body.exists = function(url) {
	    var exists = false;
	    routes.forEach(function(route) {
	      //console.log('exists', url, route.uri);
	      if( route.type === 'get' && match(url, route.uri) ) return exists = true;
	      else if( route.type === 'use' && route.uri && !url.indexOf(route.uri) ) { // middleware 는 포함하지 않음
	        if( typeof route.fn.exists !== 'function' ) return exists = match(url, route.uri);
	        exists = route.fn.exists(url.substring(route.uri.length));
	      }
	    });
	    return exists;
	  };
	  
	  body.use = function(uri, fn) {
	    if( typeof uri === 'function' ) fn = uri, uri = null;
	    if( uri && typeof uri !== 'string' ) throw new TypeError('illegal type of uri:' + typeof(uri));
	    if( typeof fn === 'string' ) fn = redirector(fn);
	    if( typeof fn !== 'function' ) throw new TypeError('illegal type of router:' + typeof(fn));
	    //if( uri && !endsWith(uri, '/') ) uri = uri + '/';
	    uri = uri ? uri.trim() : '/';
	    if( uri[0] !== '/' ) uri = '/' + uri;
	    
	    routes.push({
	      type: 'use',
	      uri: uri,
	      fn: fn
	    });
	    return this;
	  };
	  
	  body.get = function(uri, fn) {
	    if( typeof uri !== 'string' ) throw new TypeError('illegal type of uri:' + typeof(uri));
	    if( typeof fn === 'string' ) fn = redirector(fn);
	    if( typeof fn !== 'function' ) throw new TypeError('illegal type of router:' + typeof(fn));
	    uri = uri ? uri.trim() : '/';
	    if( uri[0] !== '/' ) uri = '/' + uri;
	    
	    routes.push({
	      type: 'get',
	      uri: uri,
	      fn: fn
	    });
	    return this;
	  };
	  
	  body.boot = function(fn) {
	    if( typeof fn !== 'function' ) throw new TypeError('illegal type of router:' + typeof(fn));
	    routes.push({
	      type: 'use',
	      boot: true,
	      fn: fn
	    });
	    return this;
	  };
	  
	  body.notfound = function(fn) {
	    body.on('notfound', fn);
	    return this;
	  };
	  
	  body.error = function(fn) {
	    body.on('error', fn);
	    return this;
	  };
	  
	  body.drop = function(fn) {
	    var dropfns = [];
	    routes.forEach(function(route) {
	      if( route.fn === fn ) dropfns.push(route);
	    });
	    
	    dropfns.forEach(function(route) {
	      routes.splice(routes.indexOf(route), 1);
	    });
	    return this;
	  };
	  
	  body.clear = function() {
	    routes = [];
	    return this;
	  };
	  
	  body.on = function(type, fn) {
	    listeners[type] = listeners[type] || [];
	    listeners[type].push(fn);
	    return this;
	  };
	  
	  body.once = function(type, fn) {
	    var wrap = function(e) {
	      body.off(type, wrap);
	      return fn.call(this, e);
	    };
	    body.on(type, wrap);
	    return this;
	  };
	
	  body.off = function(type, fn) {
	    var fns = listeners[type];
	    if( fns )
	      for(var i;~(i = fns.indexOf(fn));) fns.splice(i, 1);
	    
	    return this;
	  };
	
	  body.fire = function(type, detail) {
	    if( type === 'error' && !(listeners[type] && isteners[type].length) )
	      return console.error('[routes] error', detail);
	    
	    (listeners[type] || []).forEach(function(listener) {
	      listener.call(this, {
	        type: type,
	        detail: detail || {}
	      });
	    });
	  };
	  
	  return body;
	}
	
	// class Routes
	function Routes(options) {
	  if( !(this instanceof Routes) ) throw new Error('illegal state: \'new Routes()\' instead of \'Routes()\'');
	  
	  options = options || {};
	  
	  var self = this;
	  var baseURL = '';
	  var router = Router('root'), request, response, hashroutes;
	  
	  //console.info('baseURL', baseURL);
	  
	  this.config = function(key, value) {
	    var o = options;
	    if( arguments.length === 1 ) return o(key);
	    if( value === null ) delete o[key];
	    else o[key] = value;
	    return this;
	  };
	  
	  this.base = function(url) {
	    if( !arguments.length ) return baseURL;
	    if( !url ) {
	      baseURL = '';
	      return this;
	    }
	    baseURL = path.dirname(path.resolve(url, 'index.html'));
	    //console.log('baseURL', baseURL);
	    return this;
	  };
	  
	  this.router = function(name) {
	    return Router(name);
	  };
	  
	  this.normalize = function(url) {
	    url = url.trim();
	    if( !url ) return baseURL;
	    if( url[0] === '/' ) return baseURL + url;
	    return normalize(url).fullpath;
	  };
	  
	  var exec = this.exec = function(requrl) {
	    //console.info('exec', requrl);
	    var parsed = normalize(requrl);
	    var hash = parsed.hash;
	    var query = parsed.search;
	    var url = parsed.pathname;
	    var fullpath = parsed.fullpath;
	    if( request && request.requestURL && fullpath === request.requestURL ) return;
	    
	    //console.log('exec', baseURL, requrl, url, url.indexOf(baseURL), parsed);
	    if( baseURL && url.startsWith(baseURL) ) {
	      url = url.substring(baseURL.length);
	    } else if( baseURL ){
	      return console.error('given url is not a sub url of base url \'' + baseURL + '\'');
	    }
	    
	    hashroutes = [];
	    request = {
	      method: 'get',
	      parsed: parsed,
	      baseURL: baseURL,
	      requestURL: fullpath,
	      url: url,
	      hashname: hash,
	      query: parseQuery(query),
	      params: {}
	    };
	    
	    response = {
	      redirect: function(tourl) {
	        //console.info('redirect', url, request.purl, request.url, request);
	        if( tourl.startsWith('#') ) {
	          location.href = tourl;
	        } else if( tourl.startsWith('/') ) {
	          exec(path.join(baseURL, tourl));
	        } else {
	          exec(path.join(baseURL, request.purl, request.url, tourl));
	        }
	        
	        router.fire('redirect', {
	          requestURL: fullpath,
	          url: url,
	          request: request,
	          response: response
	        });
	        
	        return this;
	      },
	      hash: function(hash, fn) {
	        hashroutes.push({hash:hash, fn:fn});
	      }
	    };
	    
	    router.fire('request', {
	      requestURL: fullpath,
	      url: url,
	      request: request,
	      response: response
	    });
	    
	    router(request, response);
	    return this;
	  };
	  
	  this.exechash = function() {
	    // TODO: hash 변경. 현재 request 의 hash 를 라우팅한다.
	    return this;
	  };
	  
	  // --- wire to router
	  this.use = function(uri, fn) {
	    router.use.apply(router, arguments);
	    return this;
	  };
	  
	  this.boot = function(fn) {
	    router.boot(fn);
	    return this;
	  };
	  
	  this.get = function(uri, fn) {
	    router.get(uri, fn);
	    return this;
	  };
	  
	  this.notfound = function(fn) {
	    router.notfound(fn);
	    return this;
	  };
	  
	  this.error = function(fn) {
	    router.error(fn);
	    return this;
	  };
	  
	  this.drop = function(fn) {
	    router.drop(fn);
	    return this;
	  };
	  
	  this.exists = function(uri) {
	    return router.exists(uri);
	  };
	  
	  this.clear = function() {
	    router.clear();
	    return this;
	  };
	  
	  this.on = function(type, fn) {
	    router.on(type, fn);
	    return this;
	  };
	  
	  this.once = function(type, fn) {
	    router.once(type, fn);
	    return this;
	  };
	  
	  this.off = function(type, fn) {
	    router.off(type, fn);
	    return this;
	  };
	}
	
	var routes = new Routes();
	routes.Routes = Routes;
	routes.Router = Router;
	
	// instantiate main routes && trigger
	(function() {
	  //var always = config('routes.always') === 'true' ? true : true;
	  var mode = config('routes.mode') || (history.pushState ? 'pushstate' : 'hash');
	  
	  if( mode === 'pushstate' ) {
	    if( !history.pushState ) return console.error('[routes] unsupported \'history.pushState\'');
	    
	    var _pushState = history.pushState;
	    history.pushState = function(state, title, url) {
	      _pushState.apply(history, arguments);
	      routes.exec(location.href);
	    };
	    
	    window.onpopstate = function(e) {
	      routes.exec(location.href);
	    };
	    
	    routes.on('request', function(e) {
	      if( normalize(location.href).fullpath !== normalize(e.detail.requestURL).fullpath ) {
	        _pushState.call(history, null, null, e.detail.requestURL);
	      }
	    });
	    
	    routes.href = function(url) {
	      history.pushState(null, null, routes.normalize(url));
	    };
	  } else if( mode === 'hash' ) {
	    if( !('onhashchange' in window) ) return console.error('[routes] unsupported \'onhashchange\'');
	    
	    addEventListener(window, 'hashchange', function() {
	      routes.exec(location.hash);
	    });
	    
	    routes.on('redirect', function(e) {
	      location.href = '#' + e.detail.url;
	    });
	    
	    routes.href = function(url) {
	      location.href = '#' + routes.normalize(url);
	    };
	  }
	  
	  var observer;
	  function bootup() {
	    function routify(a) {
	      if( !a.__routes_managed__ ) {
	        a.__routes_managed__ = true;
	        addEventListener(a, 'click', function(e) {
	          e.preventDefault();
	          routes.href(a.getAttribute('href'));
	        });
	      }
	      return this;
	    }
	  
	    function scan() {
	      [].forEach.call(document.querySelectorAll('[routes], [data-routes]'), routify);
	      return this;
	    }
	    
	    // observe anchor tags
	    if( observer ) observer.disconnect();
	    observer = new MutationObserver(function(mutations) {
	      mutations.forEach(function(mutation) {
	        [].forEach.call(mutation.addedNodes, function(node) {
	          if( node.nodeType === 1 ) {
	            if( node.hasAttribute('routes') ) routify(node);
	            if( node.hasAttribute('data-routes') ) routify(node);
	            if( node.querySelectorAll ) [].forEach.call(node.querySelectorAll('[routes], [data-routes]'), routify);
	          }
	        });
	      });
	    });
	    
	    observer.observe(document.body, {
	      childList: true,
	      subtree: true
	    });
	    
	    scan();
	    routes.exec(location.href);
	  }
	  
	  if( document.body ) bootup();
	  else addEventListener(document, 'DOMContentLoaded', bootup);
	})();
	
	module.exports = routes;


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.
	
	// resolves . and .. elements in a path array with directory names there
	// must be no slashes, empty elements, or device names (c:\) in the array
	// (so also no leading and trailing slashes - it does not distinguish
	// relative and absolute paths)
	function normalizeArray(parts, allowAboveRoot) {
	  // if the path tries to go above the root, `up` ends up > 0
	  var up = 0;
	  for (var i = parts.length - 1; i >= 0; i--) {
	    var last = parts[i];
	    if (last === '.') {
	      parts.splice(i, 1);
	    } else if (last === '..') {
	      parts.splice(i, 1);
	      up++;
	    } else if (up) {
	      parts.splice(i, 1);
	      up--;
	    }
	  }
	
	  // if the path is allowed to go above the root, restore leading ..s
	  if (allowAboveRoot) {
	    for (; up--; up) {
	      parts.unshift('..');
	    }
	  }
	
	  return parts;
	}
	
	// Split a filename into [root, dir, basename, ext], unix version
	// 'root' is just a slash, or nothing.
	var splitPathRe =
	    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
	var splitPath = function(filename) {
	  return splitPathRe.exec(filename).slice(1);
	};
	
	// path.resolve([from ...], to)
	// posix version
	exports.resolve = function() {
	  var resolvedPath = '',
	      resolvedAbsolute = false;
	
	  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
	    var path = (i >= 0) ? arguments[i] : process.cwd();
	
	    // Skip empty and invalid entries
	    if (typeof path !== 'string') {
	      throw new TypeError('Arguments to path.resolve must be strings');
	    } else if (!path) {
	      continue;
	    }
	
	    resolvedPath = path + '/' + resolvedPath;
	    resolvedAbsolute = path.charAt(0) === '/';
	  }
	
	  // At this point the path should be resolved to a full absolute path, but
	  // handle relative paths to be safe (might happen when process.cwd() fails)
	
	  // Normalize the path
	  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
	    return !!p;
	  }), !resolvedAbsolute).join('/');
	
	  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
	};
	
	// path.normalize(path)
	// posix version
	exports.normalize = function(path) {
	  var isAbsolute = exports.isAbsolute(path),
	      trailingSlash = substr(path, -1) === '/';
	
	  // Normalize the path
	  path = normalizeArray(filter(path.split('/'), function(p) {
	    return !!p;
	  }), !isAbsolute).join('/');
	
	  if (!path && !isAbsolute) {
	    path = '.';
	  }
	  if (path && trailingSlash) {
	    path += '/';
	  }
	
	  return (isAbsolute ? '/' : '') + path;
	};
	
	// posix version
	exports.isAbsolute = function(path) {
	  return path.charAt(0) === '/';
	};
	
	// posix version
	exports.join = function() {
	  var paths = Array.prototype.slice.call(arguments, 0);
	  return exports.normalize(filter(paths, function(p, index) {
	    if (typeof p !== 'string') {
	      throw new TypeError('Arguments to path.join must be strings');
	    }
	    return p;
	  }).join('/'));
	};
	
	
	// path.relative(from, to)
	// posix version
	exports.relative = function(from, to) {
	  from = exports.resolve(from).substr(1);
	  to = exports.resolve(to).substr(1);
	
	  function trim(arr) {
	    var start = 0;
	    for (; start < arr.length; start++) {
	      if (arr[start] !== '') break;
	    }
	
	    var end = arr.length - 1;
	    for (; end >= 0; end--) {
	      if (arr[end] !== '') break;
	    }
	
	    if (start > end) return [];
	    return arr.slice(start, end - start + 1);
	  }
	
	  var fromParts = trim(from.split('/'));
	  var toParts = trim(to.split('/'));
	
	  var length = Math.min(fromParts.length, toParts.length);
	  var samePartsLength = length;
	  for (var i = 0; i < length; i++) {
	    if (fromParts[i] !== toParts[i]) {
	      samePartsLength = i;
	      break;
	    }
	  }
	
	  var outputParts = [];
	  for (var i = samePartsLength; i < fromParts.length; i++) {
	    outputParts.push('..');
	  }
	
	  outputParts = outputParts.concat(toParts.slice(samePartsLength));
	
	  return outputParts.join('/');
	};
	
	exports.sep = '/';
	exports.delimiter = ':';
	
	exports.dirname = function(path) {
	  var result = splitPath(path),
	      root = result[0],
	      dir = result[1];
	
	  if (!root && !dir) {
	    // No dirname whatsoever
	    return '.';
	  }
	
	  if (dir) {
	    // It has a dirname, strip trailing slash
	    dir = dir.substr(0, dir.length - 1);
	  }
	
	  return root + dir;
	};
	
	
	exports.basename = function(path, ext) {
	  var f = splitPath(path)[2];
	  // TODO: make this comparison case-insensitive on windows?
	  if (ext && f.substr(-1 * ext.length) === ext) {
	    f = f.substr(0, f.length - ext.length);
	  }
	  return f;
	};
	
	
	exports.extname = function(path) {
	  return splitPath(path)[3];
	};
	
	function filter (xs, f) {
	    if (xs.filter) return xs.filter(f);
	    var res = [];
	    for (var i = 0; i < xs.length; i++) {
	        if (f(xs[i], i, xs)) res.push(xs[i]);
	    }
	    return res;
	}
	
	// String.prototype.substr - negative index don't work in IE8
	var substr = 'ab'.substr(-1) === 'b'
	    ? function (str, start, len) { return str.substr(start, len) }
	    : function (str, start, len) {
	        if (start < 0) start = str.length + start;
	        return str.substr(start, len);
	    }
	;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(2)))

/***/ },
/* 2 */
/***/ function(module, exports) {

	// shim for using process in browser
	
	var process = module.exports = {};
	
	// cached from whatever global is present so that test runners that stub it
	// don't break things.  But we need to wrap it in a try catch in case it is
	// wrapped in strict mode code which doesn't define any globals.  It's inside a
	// function because try/catches deoptimize in certain engines.
	
	var cachedSetTimeout;
	var cachedClearTimeout;
	
	(function () {
	  try {
	    cachedSetTimeout = setTimeout;
	  } catch (e) {
	    cachedSetTimeout = function () {
	      throw new Error('setTimeout is not defined');
	    }
	  }
	  try {
	    cachedClearTimeout = clearTimeout;
	  } catch (e) {
	    cachedClearTimeout = function () {
	      throw new Error('clearTimeout is not defined');
	    }
	  }
	} ())
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;
	
	function cleanUpNextTick() {
	    if (!draining || !currentQueue) {
	        return;
	    }
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}
	
	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = cachedSetTimeout(cleanUpNextTick);
	    draining = true;
	
	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    cachedClearTimeout(timeout);
	}
	
	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        cachedSetTimeout(drainQueue, 0);
	    }
	};
	
	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};
	
	function noop() {}
	
	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;
	
	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};
	
	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ }
/******/ ])
});
;
//# sourceMappingURL=routes.js.map