var XMLReader = require('./app/xmlreader');
var XMLUtil = require('./app/xmlutil');
var wikiFetcher = require('./app/wikifetcher');

var initNamespace = function() {
  window.app = window.app || {};
}

var run = function() {
  
  initNamespace();
  
  var intro_scene = require('./scenes/intro');
  require('./scenes/manager').loadScene(intro_scene);
}

module.exports = { run: run };