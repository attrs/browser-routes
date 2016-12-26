(function() {
  if( !String.prototype.endsWith ) {
    String.prototype.endsWith = function(suffix) {
      return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
  }
  
  if( !String.prototype.startsWith ) {
    String.prototype.startsWith = function(searchString, position){
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
    };
  }
  
  if( !Array.prototype.forEach ) {
    Array.prototype.forEach = function(callback){
      for (var i = 0; i < this.length; i++){
        callback.apply(this, [this[i], i, this]);
      }
    };
  }
  
  if( !Array.prototype.indexOf ) {
    Array.prototype.indexOf = function(obj, start) {
      for (var i = (start || 0); i < this.length; i++) {
        if (this[i] == obj) return i;
      }
      return -1;
    };
  }
  
  if( !Array.prototype.lastIndexOf ) {
    Array.prototype.lastIndexOf = function( item , index ){ 
      var index = ( index ) ? parseInt( index , 10 ) : this.length - 1; 
      if ( index < 0 ) index = this.length + index; 
      for ( index; index > -1; index-- ){  if ( this[ index ] === item ) return index;  } 
      return -1; 
    };
  }
  
  if( !String.prototype.trim ) {
    String.prototype.trim = function() {
      return this.replace(/^\s+|\s+$/g, ''); 
    };
  }
  
  if( !document.head ) document.head = document.getElementsByTagName('head')[0];
})();


var xrouter = module.exports = require('./app.js');
xrouter.middleware.add(require('./initiator/render.js'));
xrouter.middleware.add(require('./initiator/redirect.js'));
xrouter.scanner = require('./scanner.js').start();

if( typeof window === 'object' ) {
  window.xrouter = {
    href: function(href) {
      return xrouter.pathbar.href(href);
    }
  };
}