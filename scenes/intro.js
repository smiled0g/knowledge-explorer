var Dropzone = require('dropzone'),
    SceneManager = require('./manager'),
    XMLReader = require('../app/xmlreader');

module.exports = {
  el: '#SCENE_INTRO',
  fileEl: '#FILE_LISTENER',
  init: function() {
    // Listen for xml file to be uploaded
    new Dropzone(this.fileEl, {
      url: '#',
      accept: function(file) {
        XMLReader.readFile(file, function(xml){
          app.$data = xml;
          // Remove file listener to prevent unwanted <g>
          $(this.fileEl).empty();
          // Load next scene
          var nextScene = require('./edit');
          SceneManager.loadScene(nextScene);
        }.bind(this));
      }.bind(this)
    });
  }
};