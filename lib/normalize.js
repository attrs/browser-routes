var a = document.createElement('a');

module.exports = function normalize(url) {
  if( typeof url !== 'string' ) throw new TypeError('illegal url');
  
  a.href = url || '';
  var fullpath = a.href;
  fullpath = fullpath.substring(fullpath.indexOf('://') + 3);
  if( !~fullpath.indexOf('/') ) fullpath = '/';
  else fullpath = fullpath.substring(fullpath.indexOf('/'));
  
  var pathname = fullpath;
  pathname = ~pathname.indexOf('?') ? pathname.substring(0, pathname.indexOf('?')) : pathname;
  pathname = ~pathname.indexOf('#') ? pathname.substring(0, pathname.indexOf('#')) : pathname;
  
  return {
    href: a.href,
    protocol: a.protocol,
    hostname: a.hostname,
    port: a.port,
    pathname: pathname,
    fullpath: pathname + (a.search ? a.search : '') + (a.hash ? a.hash : ''),
    search: a.search,
    hash: a.hash,
    host: a.host
  };
}