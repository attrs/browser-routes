module.exports = function(name, alt) {
  var tag = document.head.querySelector('meta[name="xrouter.' + name + '"]');
  return (tag && tag.getAttribute('content')) || alt;
};