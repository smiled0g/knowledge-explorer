var $ = require('jquery');
module.exports = {
  readFile: function(file, callback) { 
    if (file) {
      var reader = new FileReader();
      reader.onload = function(e) { 
        var contents = e.target.result;
        callback($($.parseXML(contents)).find('AIMind'));
      }
      reader.readAsText(file);
    } else { 
      status.update("Failed to load file");
    }
  }
}