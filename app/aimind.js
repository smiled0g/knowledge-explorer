var Graph = require('./graph'),
SearchStorage = require('./search-storage'),
Knowledge = require('./knowledge'),
DBpedia = require('./dbpedia'),
Console = require('./console'),
fs = require('fs'),
pd = require('./pretty-data').pd,
xml2js = require('xml2js'),
dialog = require('electron').remote.dialog;

var handleAddResourceToGraph = function (uri) {
	var searchResult = SearchStorage.get(uri);

	return Knowledge.addNode(
		searchResult.uri,
		searchResult.label,
		searchResult.relationships,
		searchResult.geodata,
		searchResult.timedata,
		false);
}

var importFeatureWithURI = function (feature, counter) {
	var uri = feature.$.uri;

	// If the resource is currently in the graph, skip it
	if (Knowledge.getGraph().graph[uri]) {
		return;
	}

	// Add resource to graph, if it's been searched before, without fetching new data
	//   otherwise, fetch the resource data and add to graph
	if (SearchStorage.get(uri)) {
		handleAddResourceToGraph(uri);
	} else {
		//disabling abstract because the sentences are wonky... description is better... don't know more direct method besides search
		/*DBpedia.getAbstractByUriAndLanguage(uri, 'en', function (abstract_result) { */

		DBpedia.searchByKeyword(feature.$.data, function (results) {
			var abstrct, label;
			if (results.length == 0 || results[0].label != feature.$.data) { //if not an exact match, use the existing description
				abstrct = feature.speak[0];
				label = feature.$.data;
			} else {
				abstrct = results[0].description;
				label = results[0].label;
			}

			// If abstract not found on the uri, move on
			/*if (abstract_result.results.bindings.length === 0) {
			counter();
			return;
			} else {*/
			DBpedia.getRelationshipsByUri(uri, function (relationships) {
				DBpedia.getLocationByUri(uri, function (geodata) {
					DBpedia.getTimeDataByUri(uri, function (timedata) {
						/*var abstrct = abstract_result.results.bindings[0].abs.value,
						label = abstract_result.results.bindings[0].name.value,*/
						
						var formatted_description = DBpedia.getFormattedDescription(abstrct),
						first_sentence = DBpedia.getFirstSentence(formatted_description);
						SearchStorage.add({
							uri : uri,
							label : label,
							description : formatted_description,
							speak : first_sentence,
							relationships : relationships,
							geodata : geodata,
							timedata : timedata
						});
						handleAddResourceToGraph(uri);
						counter();
					});
				});
			});
			/*}*/
		});
	}
}

var importFeatureWithoutURI = function (feature, relationships, counter) {
	var uri = '#' + feature.$.data;

	SearchStorage.add({
		uri : uri,
		label : feature.$.data,
		description : feature.speak,
		speak : feature.speak,
		relationships : relationships
	});
	handleAddResourceToGraph(uri);
	counter();
}

var promptMatchFeature = function (feature, counter, onSuccess, onFailure) {
	DBpedia.searchByKeyword(feature.$.data, function (results) {
		if (results.length > 0) {
			labels = []
			for (result of results) {
				labels.push(result.label)
			}
			labels.push("None")

			// Show the dialog box
			var index = dialog.showMessageBox({
					message : feature.$.data,
					detail : "Select the DBpedia entry that best matches this feature",
					buttons : labels
				});

			// Bind the feature to its new URI
			if (index != results.length) {
				feature.$.uri = results[index].uri
					onSuccess(feature, counter);
			} else {
				onFailure(feature, counter);
			}
		} else {
			console.log("Could not find any DBpedia entries for " + feature.$.data);
			onFailure(feature, counter);
		}
	});
}

// Import an AIMind XML file
var _import = function () {
	var FeatureMapping = {}; // Temporary mapping from $.data -> DBpedia's URI

	dialog.showOpenDialog({
		title : 'Import from AIMind XML',
		properties : ['openFile']
	},
		function (path) {
		var parser = new xml2js.Parser({
				normalizeTags : false
			});
		fs.readFile(path[0], function (err, data) {
			parser.parseString(data, function (err, result) {
				// Define counter that counts for how many feature has been imported
				var nFeatures = result.AIMind.Features[0].Feature.length,
				remaining = nFeatures;

				var counter = function () {
					remaining--;
					console.log(remaining + " remaining");
					if (remaining === 0) {
						// Import done
						// Render graph
						Knowledge.drawGraph();
					}
					onProgress((nFeatures - remaining) * 100.0 / nFeatures);
				}

				var onProgress = function () {};
				Console.showProgressResponse(
					'Please wait while graph is being imported',
					'Import done!',
					function (progressListener) {
					// Assign function to call on progress
					onProgress = progressListener;
				});

				// Create mapping between id and uri
				var idToUriMap = {};
				result.AIMind.Features[0].Feature.map(function (feature) {
					var uri = feature.$.uri || ('#' + feature.$.data);
					console.log(uri);
					idToUriMap[feature.$.id] = uri;
				});

				console.log(idToUriMap);

				// Import each feature
				result.AIMind.Features[0].Feature.map(function (feature) {
					if (feature.$.uri && feature.$.uri.indexOf('#') != 0) {
						importFeatureWithURI(feature, counter);
					} else {
						// Handle xml created manually
						// Prompt match to DBpedia URI
						promptMatchFeature(feature, counter, importFeatureWithURI, function (feature, counter) {
							// Create list of relationships
							var relationships = {};
							if (feature.neighbors.length > 0 && feature.neighbors[0].neighbor) {
								feature.neighbors[0].neighbor.map(function (neighbor) {
									var relationship = {};
									relationship[neighbor.$.relationship] = '#' + neighbor.$.relationship;
									relationships[idToUriMap[neighbor.$.dest]] = relationship;
								})
							}
							importFeatureWithoutURI(feature, relationships, counter);
						});
					}
				});
			});
		});
	});
}

// Generate XML string for export
var generateXMLString = function () {
	var builder = new xml2js.Builder({
			rootName : "AIMind"
		}),
	graph = Knowledge.getGraph();

	var aimind = {
		Root : {
			$ : {
				id : '0'
			}
		},
		Features : {
			Feature : []
		}
	};

	Object.keys(graph.graph).map(function (uri) {
		var feature = {
			$ : {
				data : 'root',
				'zh-data' : '',
				id : '0',
				uri : ''
			},
			neighbors : {
				neighbor : []
			},
			geodata : {
				coordinates : []
			},
			timedata : {
				timeobj : []
			},
			speak : '',
			'zh-speak' : ''
		};

		sKey = SearchStorage.get(uri);

		// Add a new feature into JSON object
		feature.$.data = sKey.label;
		feature.$['zh-data'] = sKey.zh_label || '';
		feature.$.id = graph.graph[uri].ref;
		feature.$.uri = uri;

		feature.speak = sKey.speak;
		feature['zh-speak'] = sKey.zh_speak || '';

		graph.graph[uri].dependedOnBy.map(function (neighbor_uri) {
			var neighbor = {
				$ : {
					dest : '',
					relationship : '',
					weight : '0'
				}
			}
			neighbor.$.dest = graph.graph[neighbor_uri].ref;
			neighbor.$.relationship = Object.keys(sKey.relationships[neighbor_uri])[0];
			feature.neighbors.neighbor.push(neighbor);
		});

		gdat = sKey.geodata || [];
		gdat.map(function (latlon) {
			var coordinates = {
				$ : {
					lat : latlon[0],
					lon : latlon[1]
				}
			}
			feature.geodata.coordinates.push(coordinates);
		});

		tdat = sKey.timedata || [];
		tdat.map(function (data) {
			var timeobj = {
				$ : {
					relationship : data[0],
					value : data[1]
				}
			}
			feature.timedata.timeobj.push(timeobj);
		});

		aimind.Features.Feature.push(feature);
	});

	// Build features JSON object into XML
	var xml = pd.xml(builder.buildObject(aimind));

	return xml;
};

// Export an AIMind XML file
var _export = function (callback) {
	var xml = generateXMLString();

	dialog.showSaveDialog({
		title : 'Export to AIMind XML'
	},
	function (path) {
		// Write to file
		fs.writeFile(path, xml, function (err) {
			if (err) {
				return console.log(err);
			}
			callback(path);
		});
	});
};

module.exports = {
	import : _import,
	export : _export,
	generateXMLString : generateXMLString
}
