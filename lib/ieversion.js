module.exports = (function() {
  var nav = navigator.userAgent.toLowerCase();
  return (nav.indexOf('msie') != -1) ? parseInt(nav.split('msie')[1]) : false;
})();