var DBPedia = require('./dbpedia'),
    Voice = require('./voice'),
    Console = require('./console'),
    Knowledge = require('./knowledge'),
    SearchStorage = require('./search-storage'),
    AIMind = require('./aimind');

var run = function(data) {
  var Graph = require('./graph');
  Graph(Knowledge.getGraph()).run();

  Voice.listen(commands);
  // Disable voice command by default
  Voice.pauseListening();

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
        DBPedia.getRelationshipsByUri(results[0].uri, function(relationships){
          DBPedia.getAbstractByUriAndLanguage(results[0].uri, 'zh',  function(zh_result) {
            var zh_abstract = "",
                zh_label = "";
            if(zh_result.results.bindings.length > 0)  {
              zh_abstract = zh_result.results.bindings[0].abs.value,
              zh_label = zh_result.results.bindings[0].name.value;
            }
            SearchStorage.add({
              uri: results[0].uri,
              label: results[0].label,
              zh_label: zh_label,
              description: formatted_description,
              speak: first_sentence,
              zh_speak: zh_abstract,
              relationships: relationships
            });
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

  DBPedia.getRelationshipsOfTypeByUri(uri, ontology, function(data) {
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

  // Add particular uri to grow queue
  var addUriToQueue = function(uri) {
    // Avoid adding same resource twice
    if(!addedUri[uri]) {
      addedUri[uri] = true;

      growQueue.push(uri);
    }
  };

  // Add relationships from uri to queue
  var addRelationshipsFromUriToQueue = function(uri) {
    // Loop through all relationship and add to queue if they're not already added
    Object.keys(SearchStorage.get(uri).relationships).map(function(neighbor_uri){
      addUriToQueue(neighbor_uri);
    });
  }

  // Find and add incoming relationships from uri to queue
  var addIncomingRelationshipsFromUriToQueue = function(uri, callback) {
    // Search for incoming relatioship
    DBPedia.getIncomingRelationshipsByUri(uri, function(incoming_relationships) {
      // A dictionary that holds frequency of relatioship types
      //   it will be used to filter out some of the unwanted relatioships
      var relationshipTypeFrequency = {};
      // Populate relatioshipTypeFrequency
      Object.keys(incoming_relationships).map(function(incoming_uri) {
        Object.keys(incoming_relationships[incoming_uri]).map(function(relationship_type) {
          relationshipTypeFrequency[relationship_type] = relationshipTypeFrequency[relationship_type]+1 || 1;
        });
      });

      // Filter out some of the unwanted relatioships
      //   In this case, we are illiminating relatioship of types that appears too many times
      //   along with redirect and disambiguates relatioship
      Object.keys(incoming_relationships).map(function(incoming_uri) {
        if( incoming_relationships[incoming_uri]['Wikipage redirect'] ||
            incoming_relationships[incoming_uri]['Wikipage disambiguates']) return;

        var relationshipTypeFrequencyThreshold = 10;
        for(var relationship_type in incoming_relationships[incoming_uri]) {
          if(relationshipTypeFrequency[relationship_type] > relationshipTypeFrequencyThreshold) return;
        };


        addUriToQueue(incoming_uri);
      });

      callback();
    });
  }

  var onProgress = function() {}
  var onFinish = function() {
    Knowledge.drawGraph();
    onProgress(100);
  }

  // Function that handle selecting what node in queue to grow next, and pop that from the queue
  // TODO: Add heuristic that helps growing better than BFS
  var popQueue = function() {
    if(growQueue.length > 0) {
      return growQueue.shift();
    } else {
      return null;
    }
  }

  var processNextUriOnQueue = function() {
    if(amountToGrow === 0 || growQueue.length === 0) {
      onFinish();
      return;
    }

    onProgress((limit-amountToGrow)*100.0/limit);

    // Get next URI to process
    var uri = popQueue();

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
      addRelationshipsFromUriToQueue(uri);
      processNextUriOnQueue();
    } else {
      // Search for English abstract
      DBPedia.getAbstractByUriAndLanguage(uri, 'en', function(abstract_result) {       // If abstract not found on the uri, move on
        if(abstract_result.results.bindings.length === 0)  {
          processNextUriOnQueue();
        } else {
          // Fetch relationship
          DBPedia.getRelationshipsByUri(uri, function(relationships){
            var abstract = abstract_result.results.bindings[0].abs.value,
                label = abstract_result.results.bindings[0].name.value,
                formatted_description = DBPedia.getFormattedDescription(abstract),
                first_sentence = DBPedia.getFirstSentence(formatted_description);
            // Fetch Chinese abstract
            DBPedia.getAbstractByUriAndLanguage(uri, 'zh',  function(zh_result) {
              var zh_abstract = "",
                  zh_label = "";
              if(zh_result.results.bindings.length > 0)  {
                zh_abstract = zh_result.results.bindings[0].abs.value,
                zh_label = zh_result.results.bindings[0].name.value;
              }
              // Add search result to SearchStorage
              SearchStorage.add({
                uri: uri,
                label: label,
                zh_label: zh_label,
                description: formatted_description,
                speak: first_sentence,
                zh_speak: zh_abstract,
                relationships: relationships
              });
              // Add resource to graph
              handleAddResourceToGraph(uri, false);
              // Add outgoing relationships to grow queue
              addRelationshipsFromUriToQueue(uri);
              // Add incoming relationships to grow queue
              addIncomingRelationshipsFromUriToQueue(uri, processNextUriOnQueue);
            });
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

  // Add initial URI to grow from root's relationships
  addRelationshipsFromUriToQueue(rootUri);
  addIncomingRelationshipsFromUriToQueue(rootUri, processNextUriOnQueue);
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

var handleRemove = function(r) {
  var uri = Knowledge.getUriFromRefOrName(r);
  Knowledge.removeNode(uri, true)
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
  'Remove *r': handleRemove,
  'Activate voice command': function() {
    Voice.pauseListening();
    showVoiceAndConsoleResponse('Voice command activated');
  },
  'Deactivate voice command': function() {
    Voice.resumeListening();
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
