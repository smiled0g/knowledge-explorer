var Graph = require('./graph'),
    SearchStorage = require('./search-storage')
    fs = require('fs'),
    pd = require('./pretty-data').pd;

var _import = function() {

};

var _export = function(graph, filename) {
  var xml = $('<AIMind></AIMind>');
  xml.append('<Root id="1" />');
  Object.keys(graph.graph).map(function(uri){
    var feature = $('<Feature data="'+SearchStorage.get(uri).label+'" id="'+graph.graph[uri].ref+'"></Feature>');
    graph.graph[uri].dependedOnBy.map(function(neighbor_uri){
      if(!graph.graph[uri].depends[neighbor_uri]) {
        feature.append(
          $('<Neighbor dest="'+graph.graph[neighbor_uri].ref+'" relationship="" weight="0" />')
        );
      }
    });
    graph.graph[uri].depends.map(function(parent_uri){
      feature.append(
        $('<Parent dest="'+graph.graph[parent_uri].ref+'" relationship="" weight="1" />')
      );
    });

    feature.append($('<Speak value="'+SearchStorage.get(uri).speak+'" />'));
    
    xml.append(feature);
  });

  fs.writeFile(filename, pd.xml(xml[0].outerHTML), function(err) {
      if(err) {
          return console.log(err);
      }
      // Space for console response
  });
  console.log(xml);
};

module.exports = {
    import: _import,
    export: _export
}
