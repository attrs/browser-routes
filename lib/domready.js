module.exports = function(fn) {
  if( document.body ) {
    window.setTimeout(fn, 1);
  } else {
    if( document.addEventListener ) {
      document.addEventListener('DOMContentLoaded', function() {
        window.setTimeout(fn, 1);
      });
    } else if( document.attachEvent ) {
      document.attachEvent('onreadystatechange', function () {
        if( document.readyState === 'complete' ) window.setTimeout(fn, 1);
      });
    }
  }
};