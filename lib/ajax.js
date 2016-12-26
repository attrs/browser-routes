module.exports = function(src, done) {
  if( !src ) throw new Error('missing src');
  var text, error;
  var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
  xhr.open('GET', src, true);
  xhr.onreadystatechange = function(e) {
    if( this.readyState == 4 ) {
      if( this.status == 0 || (this.status >= 200 && this.status < 300) ) done.call(router, null, this.responseText);
      else done.call(router, new Error('[' + this.status + '] ' + this.responseText));
    }
  };
  xhr.send();
};