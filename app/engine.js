var DBPedia = require('./dbpedia'),
    Voice = require('./voice'),
    Console = require('./console'),
    Knowledge = require('./knowledge'),
    SearchStorage = require('./search-storage'),
    AIMind = require('./aimind');

var run = function(data) {
  var Graph = require('./graph');
  Graph(Knowledge.getGraph()).run();

  var Voice = require('./voice');
  Voice.listen(commands);

  var Console = require('./console');
  Console.initQueryInput(commands);
}

var showVoiceAndConsoleResponse = function(response, option) {
  Voice.speak(response);
  Console.showResponse(response, option);
}

var showConsoleInfoboxResponse = function($response, option) {
  Console.showInfoboxResponse($response, option);
}

var handleSearchByKeyword = function(keyword) {
  DBPedia.searchByKeyword(keyword, function(results) {
    console.log(results);
    if(results.length > 0) {
      // Speak first sentence of the description
      var formatted_description =
        results[0].description
          .replace(/\[.*\d.*\]/g,'')
          .replace(/\(.*\)/g,'');

      var first_sentence = formatted_description;
      if(formatted_description.match(/(^.*?[a-z]{2,}[.!?])\s+\W*[A-Z]/)) {
        first_sentence = formatted_description.match(/(^.*?[a-z]{2,}[.!?])\s+\W*[A-Z]/)[1];
      }

      DBPedia.getInfobox(results[0].uri.split('/').pop().trim(), function(data){
        var infobox = $('<div>'+data.replace(/\/\//g, 'https://')+'</div>').children('.infobox');
        if(infobox.length) {
          Voice.speak(first_sentence);
          showConsoleInfoboxResponse(infobox, {
            add: {
              uri: results[0].uri,
              name: results[0].label
            }
          });
        } else {
          showVoiceAndConsoleResponse(first_sentence, {
            add: {
              uri: results[0].uri,
              name: results[0].label
            }
          });
        }
        DBPedia.getPropertiesByUri(results[0].uri, function(relationships){
          SearchStorage.add({
            uri: results[0].uri,
            label: results[0].label,
            description: formatted_description,
            speak: first_sentence,
            relationships: relationships
          });
        });
      });
    } else {
      showVoiceAndConsoleResponse('I\'m sorry, I couldn\'t find any information with keyword '+keyword);
    }

  });
}

var handleAddLastSearchResultToGraph = function() {
  var lastSearchResult = SearchStorage.getLatest();
  Knowledge.addNode(
    lastSearchResult.uri,
    lastSearchResult.label,
    lastSearchResult.relationships,
    true
  );
}

var handleAddResourceToGraph = function(uri) {
  console.log(uri);
  var searchResult = SearchStorage.get(uri);

  return Knowledge.addNode(
    searchResult.uri,
    searchResult.label,
    searchResult.relationships,
    true
  );
}

var handleSeachByOntology = function(keyword, ontology) {
  keyword = keyword.replace(/\W/g, '')

  var uri = Knowledge.getUriFromRefOrName(keyword) || SearchStorage.getUriFromName(keyword);

  DBPedia.getPropertiesOfTypeByUri(uri, ontology, function(data) {
    console.log(data);
    if(Object.keys(data).length > 0) {
      Console.showResultsList(data);
    } else {
      showVoiceAndConsoleResponse('I\'m sorry, I couldn\'t find any '+ontology.toLowerCase()+' associated with resource '+keyword);
    }
  });
}

var handleGrow = function(keyword) {
  keyword = keyword.replace(/\W/g, '')

  var root_uri = Knowledge.getUriFromRefOrName(keyword) || SearchStorage.getUriFromName(keyword),
      growQueue = [root_uri],
      amountToGrow = 50;

  while(growQueue.length > 0 && amountToGrow > 0) {
    var uri = growQueue.shift();
    console.log(uri);
    if(Knowledge.getGraph().graph[uri] && uri!=root_uri) continue;
    Object.keys(SearchStorage.get(uri).relationships).map(function(neighbor_uri){
      console.log(neighbor_uri);
      if(!SearchStorage.get(neighbor_uri)) {
        DBPedia.getAbstractByUri(neighbor_uri, function(abstract_result){
          DBPedia.getPropertiesByUri(neighbor_uri, function(relationships){
            var abstract = abstract_result.results.bindings[0].abs.value;
            var label = abstract_result.results.bindings[0].name.value;
            SearchStorage.add({
              uri: neighbor_uri,
              label: label,
              description: abstract,
              speak: abstract,
              relationships: relationships
            });
            if(handleAddResourceToGraph(neighbor_uri)) amountToGrow--;
            growQueue.push(neighbor_uri);
          });
        });
      } else {
        if(handleAddResourceToGraph(neighbor_uri)) amountToGrow--;
      }
    });
  }
}

var handleLink = function(r1, r2) {
  var uri1 = Knowledge.getUriFromRefOrName(r1),
      uri2 = Knowledge.getUriFromRefOrName(r2);

  if(uri1 && uri2) {
    Knowledge.addLink(uri1, uri2, 'Unknown', true);
  }
}

var handleUnlink = function(r1, r2) {
  var uri1 = Knowledge.getUriFromRefOrName(r1),
      uri2 = Knowledge.getUriFromRefOrName(r2);

  if(uri1 && uri2) {
    Knowledge.removeLink(uri1, uri2, true);
  }
}

var commands = {
  '(hi) (hello) jimmy': function() {
    showVoiceAndConsoleResponse('I\'m here!');
  },
  'What is *keyword': handleSearchByKeyword,
  'Who is *keyword': handleSearchByKeyword,
  'Find *keyword': handleSearchByKeyword,
  'Search (for) *keyword': handleSearchByKeyword,
  'Add (to graph)': handleAddLastSearchResultToGraph,
  'Add *uri to graph': handleAddLastSearchResultToGraph,
  'From *keyword find *ontology': handleSeachByOntology,
  'Link *r1 and *r2': handleLink,
  'Unlink *r1 and *r2': handleUnlink,
  'Activate voice command': function() {
    annyang.start();
    showVoiceAndConsoleResponse('Voice command activated');
  },
  'Deactivate voice command': function() {
    annyang.abort();
    showVoiceAndConsoleResponse('Voice command deactivated');
  },
  'Mute': function() { Voice.mute(); },
  'Unmute': function() { Voice.unmute(); },
  'Export AIMind *filename': function(filename) {
    AIMind.export(Knowledge.getGraph(), filename);
  },
  'Grow *keyword': handleGrow
};



module.exports = {
  run: run,
  commands: commands
}
