var XMLReader = require('./app/xmlreader');
var XMLUtil = require('./app/xmlutil');
var imageFetcher = require('./app/imagefetcher');
var wikiFetcher = require('./app/wikifetcher');

var status = require('./app/status');

var initNamespace = function() {
  window.app = window.app || {};
  // For debugging purpose only
}

var run = function() {
  
  initNamespace();
  
  var intro_scene = require('./scenes/intro');
  require('./scenes/manager').loadScene(intro_scene);
  
// Step 1: Upload the XML file
// Attach file listener to file input
//  XMLReader(document.getElementById('FILEINPUT'), function($data) {
//    app.$data = $data;
//    app.features = XMLUtil.getFeatures($data);
//    $('#STEP2').fadeIn();
//    $('#STEP3').fadeIn();
//    wikiFetcher.fetch(
//      app.features, 
//      function(wikis){
//        app.wikis = wikis;
//        $('#STEP4').fadeIn();
//      },
//      status.updateWikiProgress
//    );
//  });
}

module.exports = { run: run };