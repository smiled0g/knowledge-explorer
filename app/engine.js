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
      var formatted_description = DBPedia.getFormattedDescription(results[0].description)
      var first_sentence = DBPedia.getFirstSentence(formatted_description);

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

var handleAddResourceToGraph = function(uri, redraw) {
  var searchResult = SearchStorage.get(uri);

  return Knowledge.addNode(
    searchResult.uri,
    searchResult.label,
    searchResult.relationships,
    typeof redraw === 'undefined' ? true : redraw
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

// Use BFS to grow the graph from certain node
var handleGrow = function(keyword, limit) {
  keyword = keyword.replace(/\W/g, '')

  var rootUri = Knowledge.getUriFromRefOrName(keyword) || SearchStorage.getUriFromName(keyword),
      growQueue = [rootUri],
      addedUri = {},
      limit = limit || 10;
      amountToGrow = limit;

  // Add initial relationships from uri to queue
  var addRelationshipsToQueue = function(uri) {
    // Loop through all relationship and add to queue if they're not already added
    Object.keys(SearchStorage.get(uri).relationships).map(function(neighbor_uri){
      // Avoid adding same resource twice
      if(!addedUri[neighbor_uri]) {
        addedUri[neighbor_uri] = true;
        growQueue.push(neighbor_uri);
      }
    });
  }

  var onProgress = function() {}
  var onFinish = function() {
    Knowledge.drawGraph();
    onProgress(100);
  }

  var processNextUriOnQueue = function() {
    if(amountToGrow === 0 || growQueue.length === 0) {
      onFinish();
      return;
    }

    onProgress((limit-amountToGrow)*100.0/limit);

    // Get first URI on the queue
    var uri = growQueue.shift();

    // DEBUG
    // console.log(uri);

    // If the resource is currently in the graph, skip it
    if(Knowledge.getGraph().graph[uri]) {
      processNextUriOnQueue();
      return;
    }

    amountToGrow--;

    // Add resource to graph, if it's been searched before, within fetching new data
    //   otherwise, fetch the resource data and add to graph
    if(SearchStorage.get(uri)) {
      handleAddResourceToGraph(uri, false);
      addRelationshipsToQueue(uri);
      processNextUriOnQueue();
    } else {
      DBPedia.getAbstractByUri(uri, function(abstract_result) {       // If abstract not found on the uri, move on
        if(abstract_result.results.bindings.length === 0)  {
          processNextUriOnQueue();
        } else {
          DBPedia.getPropertiesByUri(uri, function(relationships){
            console.log(uri, abstract_result);
            var abstract = abstract_result.results.bindings[0].abs.value,
                label = abstract_result.results.bindings[0].name.value,
                formatted_description = DBPedia.getFormattedDescription(abstract),
                first_sentence = DBPedia.getFirstSentence(formatted_description);
            SearchStorage.add({
              uri: uri,
              label: label,
              description: formatted_description,
              speak: first_sentence,
              relationships: relationships
            });
            handleAddResourceToGraph(uri, false);
            addRelationshipsToQueue(uri);
            processNextUriOnQueue();
          });
        }
      });
    }
  }

  Console.showProgressResponse(
    'Please wait while growing is in progress',
    'Growing done!',
    function(progressListener){
      onProgress = progressListener;
    }
  );

  addRelationshipsToQueue(rootUri);
  processNextUriOnQueue();
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
  'Export AIMind': function() {
    AIMind.export(function(path) {
      showVoiceAndConsoleResponse('Exported AIMind to ' + path);
    });
  },
  'Import AIMind': function() {
    AIMind.import(function(path) {
      showVoiceAndConsoleResponse('Imported AIMind from ' + path);
    });
  },
  'Grow *keyword (for *limit)': handleGrow
};



module.exports = {
  run: run,
  commands: commands,
}
