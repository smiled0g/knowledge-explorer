var DBpedia = require('./dbpedia'),
Graph = require('./graph'),
Voice = require('./voice'),
Console = require('./console'),
Knowledge = require('./knowledge'),
SearchStorage = require('./search-storage'),
AIMind = require('./aimind'),
HttpServer = require('./http-server'),
Analogy = require('./analogy'),
Narration = require('./narrativebackend'),
Interest = require('./userinterest');

var run = function (data) {
	Graph.init(Knowledge.getGraph());
	Graph.run();

	//Voice.listen(commands);
	// Disable voice command by default
	//Voice.pauseListening();

	var Console = require('./console');
	Console.initQueryInput(commands);
}

var showVoiceAndConsoleResponse = function (response, option) {
	//Voice.speak(response);
	Console.showResponse(response, option);
}

var showConsoleInfoboxResponse = function ($response, option) {
	Console.showInfoboxResponse($response, option);
}

var handleSearchByKeyword = function (keyword) {
	// Helper function that return if label/uri and keyword searched matches each other
	var isKeywordMatchedLabelOrUri = function (keyword, label, uri) {
		label = label.replace(/ /g, '_').toLowerCase();
		keyword = keyword.replace(/ /g, '_').toLowerCase();
		console.log(label, keyword, uri);
		return label.indexOf(keyword) >= 0 ||
		uri.split('/').pop().toLowerCase() === keyword;
	}
	// Perform DBpedia search
	DBpedia.searchByKeyword(keyword, function (results) {
		console.log(results);
		if (results.length > 0) {
			// Check if label or uri matches keyword, if not, search for the one that matches
			if (!isKeywordMatchedLabelOrUri(keyword, results[0].label, results[0].uri)) {
				// Search
				var match_found = false;
				for (var i = 1; i < results.length; i++) {
					if (isKeywordMatchedLabelOrUri(keyword, results[i].label, results[i].uri)) {
						match_found = true;
						results[0] = results[i]; // HACK: Shamelessly assign matched result to results[0]
						break;
					}
				}
				// If match not found, display results to user
				if (!match_found) {
					var results_uri_label = {};
					results.map(function (result) {
						results_uri_label[result.uri] = result.label;
					});
					Console.showResultsList(results_uri_label);
					return;
				}
			}
			// Speak first sentence of the description
			/*var formatted_description = DBpedia.getFormattedDescription(results[0].description);
			var first_sentence = DBpedia.getFirstSentence(formatted_description);*/



			DBpedia.getAllData(results[0].uri, function(result){
				var formatted_description = DBpedia.getFormattedDescription(result.description);
				var first_sentence = result.speak || DBpedia.getFirstSentence(formatted_description);

				SearchStorage.add({
					uri : results[0].uri,
					label : results[0].label,
					description : formatted_description,
					speak : first_sentence,
					relationships : result.relationships,
					geodata : result.geodata,
					timedata : result.timedata,
					thumbnail : result.thumbnail,
					pictures : result.pictures
				});

				DBpedia.getInfobox(results[0].uri.split('/').pop().trim(), function (data) {
					var infobox = $('<div>' + data.replace(/\/\//g, 'https://') + '</div>').children('.infobox');
					if (infobox.length) {
						//Voice.speak(first_sentence);
						showConsoleInfoboxResponse(infobox, {
							add : {
								uri : results[0].uri,
								name : results[0].label
							}
						});
					} else {
						showVoiceAndConsoleResponse(first_sentence, {
							add : {
								uri : results[0].uri,
								name : results[0].label
							}
						});
					}
			});

			/*DBpedia.getRelationshipsByUri(results[0].uri, function (relationships) {
				DBpedia.getAbstractByUriAndLanguage(results[0].uri, 'zh', function (zh_result) {
					DBpedia.getLocationByUri(results[0].uri, function(geodata) {
						DBpedia.getTimeDataByUri(results[0].uri, function(timedata) {

							var zh_abstract = "",
								zh_label = "";
							if (zh_result.results.bindings.length > 0) {
								zh_abstract = zh_result.results.bindings[0].abs.value,
								zh_label = zh_result.results.bindings[0].name.value;
							}
							var zh_speak = zh_abstract.split("。")[0];
							SearchStorage.add({
								uri : results[0].uri,
								label : results[0].label,
								zh_label : zh_label,
								description : formatted_description,
								speak : first_sentence,
								zh_speak : zh_speak,
								relationships : relationships,
								geodata: geodata,
								timedata: timedata
							});
						});
					});
				});
			});*/
			});
		} else {
			showVoiceAndConsoleResponse('I\'m sorry, I couldn\'t find any information with keyword ' + keyword);
		}

	});
}

var handleAddLastSearchResultToGraph = function () {
	var lastSearchResult = SearchStorage.getLatest();
	Knowledge.addNode(
		lastSearchResult.uri,
		lastSearchResult.label,
		lastSearchResult.relationships,
		true);
}

var handleAddResourceToGraph = function (uri, redraw) {
	var searchResult = SearchStorage.get(uri);

	return Knowledge.addNode(
		searchResult.uri,
		searchResult.label,
		searchResult.relationships,
		typeof redraw === 'undefined' ? true : redraw);
}

var handleSearchByOntology = function (keyword, ontology) {
	keyword = keyword.replace(/\W/g, '')

		var uri = Knowledge.getUriFromRefOrName(keyword) || SearchStorage.getUriFromName(keyword);

	DBpedia.getRelationshipsOfTypeByUri(uri, ontology, function (data) {
		if (Object.keys(data).length > 0) {
			Console.showResultsList(data);
		} else {
			showVoiceAndConsoleResponse('I\'m sorry, I couldn\'t find any ' + ontology.toLowerCase() + ' associated with resource ' + keyword);
		}
	});
}

var handleComplete = function(keywordList) {
	keywords = keywordList.split(',');
	queue = { added: {}, queue: [] };

	var addUriToQueue = function (uri) {
		if (!queue.added[uri]) {
			queue.added[uri] = true;
			queue.queue.push(uri);
		}
	};

	var addRelationshipsFromUriToQueue = function (uri, callback) {
		Object.keys(SearchStorage.get(uri).relationships).map(function (neighbor_uri) {
			addUriToQueue(neighbor_uri, queue);
		});
		if(callback) callback();
	}

	var addIncomingRelationshipsFromUriToQueue = function (uri, callback) {
		DBpedia.getIncomingRelationshipsByUri(uri, function (incoming_relationships) {
			Object.keys(incoming_relationships).map(function (incoming_uri) {
				if (incoming_relationships[incoming_uri]['Wikipage redirect'] ||
					incoming_relationships[incoming_uri]['Wikipage disambiguates'])
					return;

				addUriToQueue(incoming_uri, queue);
			});
			if(callback) callback();
		});
	}

	var processNextUriOnQueue = function () {
		if(queue.queue.length) {
			var uri = queue.queue.shift();

			DBpedia.getAllData(uri, function(result){
				if (result.description == "") {
					processNextUriOnQueue(queue);
				} else {
					var formatted_description = DBpedia.getFormattedDescription(result.description);
					var first_sentence = result.speak || DBpedia.getFirstSentence(formatted_description);
					SearchStorage.add({
						uri : uri,
						label : result.label,
						description : formatted_description,
						speak : first_sentence,
						relationships : result.relationships,
						geodata : result.geodata,
						timedata : result.timedata,
						pictures : result.pictures,
						thumbnail : result.thumbnail
					});
					handleAddResourceToGraph(uri, false);
					onProgress((toComplete - queue.queue.length) * 100.0 / toComplete);
					processNextUriOnQueue();
				}
			},
			function(){
				processNextUriOnQueue();
			});
		} else onFinish();
	}

	// Go through all the keywords, and add all immediate uris to queue
	var addAllNeighborsToQueue = function(index, onSuccess) {
		var keyword = keywords[index].replace(/\W/g, '');
		var uri = Knowledge.getUriFromRefOrName(keyword) || SearchStorage.getUriFromName(keyword);


		addRelationshipsFromUriToQueue(uri,
			addIncomingRelationshipsFromUriToQueue.bind(this, uri,
				function() {
					if(index < keywords.length-1) {
						addAllNeighborsToQueue(index+1, onSuccess);
					} else onSuccess();
				}
			)
		);
	}

	var onProgress = function () {}
	var onFinish = function () {
		Knowledge.drawGraph();
		onProgress(100);
	}
	var toComplete;

	Console.showProgressResponse(
		'Please wait while completing resource information is in progress.',
		'Completing done!',
		function (progressListener) {
		onProgress = progressListener;
	});

	addAllNeighborsToQueue(0, function() {
		toComplete = queue.queue.length;
		processNextUriOnQueue();
	});
}

// Use BFS to grow the graph from certain node
var handleGrow = function (keyword, keyword2, limit) {

	// Add particular uri to grow queue
	var addUriToQueue = function (uri, queue) {
		// Avoid adding same resource twice
		if (!queue.added[uri]) {
			queue.added[uri] = true;
			queue.queue.push(uri);
		}
	};

	// Add relationships from uri to queue
	var addRelationshipsFromUriToQueue = function (uri, queue) {
		// Loop through all relationship and add to queue if they're not already added
		Object.keys(SearchStorage.get(uri).relationships).map(function (neighbor_uri) {
			addUriToQueue(neighbor_uri, queue);
		});
	}

	// Find and add incoming relationships from uri to queue
	var addIncomingRelationshipsFromUriToQueue = function (uri, queue, callback) {
		// Search for incoming relatioship
		DBpedia.getIncomingRelationshipsByUri(uri, function (incoming_relationships) {
			// A dictionary that holds frequency of relatioship types
			//   it will be used to filter out some of the unwanted relatioships


			/*var relationshipTypeFrequency = {};
			// Populate relatioshipTypeFrequency
			Object.keys(incoming_relationships).map(function(incoming_uri) {
			Object.keys(incoming_relationships[incoming_uri]).map(function(relationship_type) {
			relationshipTypeFrequency[relationship_type] = relationshipTypeFrequency[relationship_type]+1 || 1;
			});
			});*/

			// Filter out some of the unwanted relatioships
			//   In this case, we are illiminating relatioship of types that appears too many times
			//   along with redirect and disambiguates relatioship
			Object.keys(incoming_relationships).map(function (incoming_uri) {
				if (incoming_relationships[incoming_uri]['Wikipage redirect'] ||
					incoming_relationships[incoming_uri]['Wikipage disambiguates'])
					return;

				/*var relationshipTypeFrequencyThreshold = 10;
				for(var relationship_type in incoming_relationships[incoming_uri]) {
				if(relationshipTypeFrequency[relationship_type] > relationshipTypeFrequencyThreshold) return;
				};*/

				addUriToQueue(incoming_uri, queue);
			});

			if (callback) {
				callback(queue);
			}
		});
	}

	var onProgress = function () {}
	var onFinish = function () {
		Knowledge.drawGraph();
		onProgress(100);
	}

	// Function that handle selecting what node in queue to grow next, and pop that from the queue
	// TODO: Add heuristic that helps growing better than BFS
	var popQueue = function (queue) {
		if (queue.queue.length > 0) {
			// Handle duel growth
			if (typeof secondQueue !== 'undefined') {
				if (queue == firstQueue) {
					var otherQueue = secondQueue
				} else {
					var otherQueue = firstQueue
				}
				for (i = 0; i < queue.queue.length; ++i) {
					uri = queue.queue[i]
						if (otherQueue.added[uri]) {
							queue.queue.splice(i, 1)
							return uri
						}
						return queue.queue.shift();
				}
			} else {
				return queue.queue.shift();
			}
		} else {
			return null;
		}
	}

	var processNextUriOnQueue = function (queue) {

		// If doing duel growth, swap queues
		if (typeof secondQueue !== 'undefined') {
			if (queue == firstQueue) {
				queue = secondQueue
			} else {
				queue = firstQueue
			}
		}

		if (amountToGrow === 0 || queue.queue.length === 0) {
			onFinish();
			return;
		}

		onProgress((limit - amountToGrow) * 100.0 / limit);

		// Get next URI to process
		var uri = popQueue(queue);

		// DEBUG
		// console.log(uri);

		// If the resource is currently in the graph, skip it
		if (Knowledge.getGraph().graph[uri]) {
			processNextUriOnQueue(queue);
			return;
		}

		amountToGrow--;

		// Add resource to graph, if it's been searched before, within fetching new data
		//   otherwise, fetch the resource data and add to graph
		if (SearchStorage.get(uri)) {
			handleAddResourceToGraph(uri, false);
			addRelationshipsFromUriToQueue(uri, queue);
			processNextUriOnQueue(queue);
		} else {
			// Search for English abstract
			/*DBpedia.getAbstractByUriAndLanguage(uri, 'en', function (abstract_result) { // If abstract not found on the uri, move on
				if (abstract_result.results.bindings.length === 0) {
					processNextUriOnQueue(queue);
				} else {
					// Fetch relationship
					DBpedia.getRelationshipsByUri(uri, function (relationships) {
						DBpedia.getLocationByUri(uri, function (geodata) {
							DBpedia.getTimeDataByUri(uri, function (timedata) {
								var abstrct = abstract_result.results.bindings[0].abs.value,
								label = abstract_result.results.bindings[0].name.value,
								formatted_description = DBpedia.getFormattedDescription(abstrct),
								first_sentence = DBpedia.getFirstSentence(formatted_description);
								// Fetch Chinese abstract
								DBpedia.getAbstractByUriAndLanguage(uri, 'zh', function (zh_result) {
									var zh_abstract = "",
									zh_label = "";
									if (zh_result.results.bindings.length > 0) {
										zh_abstract = zh_result.results.bindings[0].abs.value,
										zh_label = zh_result.results.bindings[0].name.value;
									}
									// Add search result to SearchStorage
									SearchStorage.add({
										uri : uri,
										label : label,
										zh_label : zh_label,
										description : formatted_description,
										speak : first_sentence,
										zh_speak : zh_abstract,
										relationships : relationships,
										geodata : geodata,
										timedata : timedata
									});
									// Add resource to graph
									handleAddResourceToGraph(uri, false);
									// Add outgoing relationships to grow queue
									addRelationshipsFromUriToQueue(uri, queue);
									// Add incoming relationships to grow queue
									addIncomingRelationshipsFromUriToQueue(uri, queue, processNextUriOnQueue);
								});
							});
						});
					});
				}
			});*/

			DBpedia.getAllData(uri, function(result){
				if (result.description == "") {
					processNextUriOnQueue(queue);
				}else{
					var formatted_description = DBpedia.getFormattedDescription(result.description);
					var first_sentence = result.speak || DBpedia.getFirstSentence(formatted_description);
					SearchStorage.add({
						uri : uri,
						label : result.label,
						description : formatted_description,
						speak : first_sentence,
						relationships : result.relationships,
						geodata : result.geodata,
						timedata : result.timedata,
						pictures : result.pictures,
						thumbnail : result.thumbnail
					});
					// Add resource to graph
					handleAddResourceToGraph(uri, false);
					// Add outgoing relationships to grow queue
					addRelationshipsFromUriToQueue(uri, queue);
					// Add incoming relationships to grow queue
					addIncomingRelationshipsFromUriToQueue(uri, queue, processNextUriOnQueue);
				}

			},
			function(){
				processNextUriOnQueue(queue);
			});
		}
	}

	Console.showProgressResponse(
		'Please wait while growing is in progress',
		'Growing done!',
		function (progressListener) {
		onProgress = progressListener;
	});

	var keyword = keyword.replace(/\W/g, '')
		firstRootUri = Knowledge.getUriFromRefOrName(keyword) || SearchStorage.getUriFromName(keyword),
	firstQueue = {
		queue : [],
		added : {}
	}
	addUriToQueue(firstRootUri, firstQueue);
	limit = limit || 10;
	amountToGrow = limit;

	// If a second keyword exists, initalize second queue
	if (keyword2) {
		var keyword2 = keyword2.replace(/\W/g, '')
			secondRootUri = Knowledge.getUriFromRefOrName(keyword2) || SearchStorage.getUriFromName(keyword2),
		secondQueue = {
			queue : [],
			added : {}
		}
		addUriToQueue(secondRootUri, secondQueue);

		addRelationshipsFromUriToQueue(secondRootUri, secondQueue);
		addIncomingRelationshipsFromUriToQueue(secondRootUri, secondQueue);
	}

	// Add initial URI to grow from root's relationships
	addRelationshipsFromUriToQueue(firstRootUri, firstQueue);
	addIncomingRelationshipsFromUriToQueue(firstRootUri, firstQueue, processNextUriOnQueue);
}

var handleLink = function (r1, r2) {
	var uri1 = Knowledge.getUriFromRefOrName(r1),
	uri2 = Knowledge.getUriFromRefOrName(r2);

	if (uri1 && uri2) {
		Knowledge.addLink(uri1, uri2, 'Unknown', true);
	}
}

var handleUnlink = function (r1, r2) {
	var uri1 = Knowledge.getUriFromRefOrName(r1),
	uri2 = Knowledge.getUriFromRefOrName(r2);

	if (uri1 && uri2) {
		Knowledge.removeLink(uri1, uri2, true);
	}
}

var handleRemove = function (r) {
	var uri = Knowledge.getUriFromRefOrName(r);
	Knowledge.removeNode(uri, true)
}

var handleMakeAnalogy = function (keyword) {
	var keyword = keyword.replace(/\W/g, '')
		nodeUri = Knowledge.getUriFromRefOrName(keyword),
		nodeRef = Knowledge.getRefFromUri(nodeUri);

	Analogy.makeAnalogyForNode(nodeRef);
}

var handleDisplayUserInterestProfile = function(){
	//display the user interest profile
	Interest.showUserInterestProfile();
}

var showNodeOnGraph = function(keyword){
	//highlight a specific node on the graph

	var keyword = keyword.substring(5),
		nodeUri = Knowledge.getUriFromRefOrName(keyword),
		nodeRef = Knowledge.getRefFromUri(nodeUri);

	graph.graph.node.each(function (d) {
		if (d.ref == nodeRef){
			Graph.selectObject(d, this);
		}
	});
}

var handleNarration = function(keyword){
	//create a narration starting from the specified node

	var keyword = keyword.replace(/\W/g, '')
		nodeUri = Knowledge.getUriFromRefOrName(keyword),
		nodeRef = Knowledge.getRefFromUri(nodeUri);

	Narration.makeNarrationForNode(nodeRef);

}

var commands = {
	'(hi) (hello) jimmy' : function () {
		showVoiceAndConsoleResponse('I\'m here!');
	},
	'What is *keyword' : handleSearchByKeyword,
	'Who is *keyword' : handleSearchByKeyword,
	'Find *keyword' : handleSearchByKeyword,
	'Search (for) *keyword' : handleSearchByKeyword,
	'Add (to graph)' : handleAddLastSearchResultToGraph,
	'Add *uri to graph' : handleAddLastSearchResultToGraph,
	'From *keyword find *ontology' : handleSearchByOntology,
	'Link *r1 and *r2' : handleLink,
	'Unlink *r1 and *r2' : handleUnlink,
	'Remove *r' : handleRemove,
	'Activate voice command' : function () {
		Voice.pauseListening();
		showVoiceAndConsoleResponse('Voice command activated');
	},
	'Deactivate voice command' : function () {
		Voice.resumeListening();
		showVoiceAndConsoleResponse('Voice command deactivated');
	},
	'Mute' : function () {
		Voice.mute();
	},
	'Unmute' : function () {
		Voice.unmute();
	},
	'Export AIMind' : function () {
		AIMind.export(function (path) {
			showVoiceAndConsoleResponse('Exported AIMind to ' + path);
		});
	},
	'Import AIMind' : function () {
		AIMind.import(function (path) {
			showVoiceAndConsoleResponse('Imported AIMind from ' + path);
		});
	},
	'Grow *keyword *keyword2 (for *limit)' : handleGrow,
	'Complete *keywordList' : handleComplete,
	'Analogy (for) *keyword' : handleMakeAnalogy,
	'Start server' : HttpServer.start,
	'Stop server' : HttpServer.stop,
	'(Show) (Display) interest' : handleDisplayUserInterestProfile,
	'Show *keyword' : showNodeOnGraph,
	'Narrate *keyword' : handleNarration
};

module.exports = {
	run : run,
	commands : commands,
}
