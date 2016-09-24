/*
 **  Helper that contains multiple DBpedia/Wikipedia query functions
 */

var $ = require('jquery'),
		infobox = require('wiki-infobox-parser'),
		QueryCache = require('./query-cache');

// Hack for delaying queries
var queryQueue = [],
	queryDelay = 50, // process query every 50ms
	processQueriesTimer = null;

function enqueueQuery(queryFn) {
	// Push query into queue
	queryQueue.push(queryFn);
	// Process query if there's no query/delayed query being placed
	if (!processQueriesTimer) {
		processQueriesTimer = setTimeout(processQueries, queryDelay);
	}
}

function processQueries() {
	if (queryQueue.length === 0)
		return;
	// Pop query from queue
	var queryFn = queryQueue.shift();
	// Schedule for processing next query
	if (queryQueue.length > 0) {
		processQueriesTime = setTimeout(processQueries, queryDelay);
	} else {
		processQueriesTimer = null;
	}
	// Execute the query
	queryFn();
}
// End of the hack

function sparqlQueryJson(queryStr, endpoint, onSuccess, onFail, isDebug) {
	/**
	 * Author: Mark Wallace
	 *
	 * This function asynchronously issues a SPARQL query to a
	 * SPARQL endpoint, and invokes the callback function with the JSON
	 * Format [1] results.
	 *
	 * Refs:
	 * [1] http://www.w3.org/TR/sparql11-results-json/
	 */

	// Try to fetch query result from cache first
	/*var cachedResult = QueryCache.get(endpoint, queryStr);
	if (cachedResult) {
		onSuccess(cachedResult);
		return;
	}*/

	// If cache not found, perform query
	var querypart = "query=" + encodeURIComponent(queryStr);

	// Get our HTTP request object.
	var xmlhttp = null;
	if (window.XMLHttpRequest) {
		xmlhttp = new XMLHttpRequest();
	} else if (window.ActiveXObject) {
		// Code for older versions of IE, like IE6 and before.
		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
	} else {
		alert('Perhaps your browser does not support XMLHttpRequests?');
	}

	// Set up a POST with JSON result format.
	xmlhttp.open('POST', endpoint, true); // GET can have caching probs, so POST
	xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xmlhttp.setRequestHeader("Accept", "application/sparql-results+json");

	// Set up callback to get the response asynchronously.
	xmlhttp.onreadystatechange = function () {
		if (xmlhttp.readyState == 4) {
			if (xmlhttp.status == 200) {
				// Cache result for further queries
				//QueryCache.set(endpoint, queryStr, $.parseJSON(xmlhttp.responseText));
				onSuccess($.parseJSON(xmlhttp.responseText));
			} else {
				onFail(xmlhttp.status, xmlhttp.responseText);
			}
		}
	};
	// Send the query to the endpoint.
	xmlhttp.send(querypart);

	// Done; now just wait for the callback to be called.
};

module.exports = {
	sparqlEndpoint : "http://dbpedia.org/sparql/",
	keywordLookupUrl : "http://lookup.dbpedia.org/api/search/KeywordSearch",

	// Seach for DBpedia resources by a given keyword
	searchByKeyword : function (keyword, onSuccess, onFail, limit) {
		$.getJSON(
			this.keywordLookupUrl, {
			QueryString : keyword,
			MaxHits : (limit || 10)
		},
			function (data) {
			return onSuccess(data.results);
		},
			onFail);
	},

	getAbstractByUriAndLanguage : function (uri, lang, onSuccess, onFail) {
		var query = [
			"PREFIX dbpedia: <http://dbpedia.org/resource/>",
			"SELECT ?name ?abs",
			"WHERE {",
			"<" + uri + "> rdfs:label ?name.",
			"<" + uri + "> dbo:abstract ?abs.",
			"FILTER (langMatches(lang(?name),'" + lang + "')).",
			"FILTER (langMatches(lang(?abs),'" + lang + "')).",
			"}"
		].join(" ");

		// Hack for delaying queries
		enqueueQuery(sparqlQueryJson.bind(this, query, this.sparqlEndpoint, onSuccess, onFail, true));
	},
	
	getDescriptionByUriAndLanguage : function(uri, lang, onSuccess, onFail) {
		var query = [
			"select ?desc",
			"where {",
			"<" + uri + "> <http://www.w3.org/2000/01/rdf-schema#comment> ?desc",
			"FILTER (langMatches(lang(?desc),'" + lang + "'))",
			"}"		
		].join(" ");
		
		// Hack for delaying queries
		enqueueQuery(sparqlQueryJson.bind(this, query, this.sparqlEndpoint, onSuccess, onFail, true));
	},

	// Fetch properties of a particular type of a resource with given uri
	getRelationshipsOfTypeByUri : function (uri, type, onSuccess, onFail) {
		// Get peoperties but NOT relationships
		var query = [
			"SELECT DISTINCT ?property ?property_label",
			"WHERE {",
			"<" + uri + "> ?relationship ?property .",
			"?property rdfs:label ?property_label .",
			"?property rdf:type ?type",
			"FILTER regex(?type,'dbpedia.org\/ontology\/" + type + "','i')",
			"FILTER regex(?relationship,'dbpedia.org','i')",
			"FILTER (langMatches(lang(?property_label),'en')).",
			"}"
		].join(" ");

		// Hack for delaying queries
		enqueueQuery(
			// Execute query
			sparqlQueryJson.bind(this, query, this.sparqlEndpoint, function (results) {
				// Format query
				var list = {};
				results.results.bindings.map(function (r) {
					list[r.property.value] = r.property_label.value;
				});
				onSuccess(list);
			}, onFail, true));
	},

	// Fetch properties and relationships of a resource with given uri
	getRelationshipsByUri : function (uri, onSuccess, onFail) {
		var query = [
			"SELECT DISTINCT (?relationship AS ?r) (?relationship_label AS ?rl) (?property AS ?p)",
			"WHERE {",
			"<" + uri + "> ?relationship ?property .",
			"?property rdfs:label ?property_label .",
			"?relationship rdfs:label ?relationship_label .",
			"FILTER regex(?relationship,'dbpedia.org','i')",
			"FILTER (langMatches(lang(?property_label),'en')).",
			"FILTER (langMatches(lang(?relationship_label),'en')).",
			"}"
		].join(" ");
		
		// Hack for delaying queries
		enqueueQuery(
			// Execute query
			sparqlQueryJson.bind(this, query, this.sparqlEndpoint, function (results) {
				// Format query
				var relationships = {};
				results.results.bindings.map(function (result) {
					if (!relationships[result.p.value]) {
						relationships[result.p.value] = {};
					}
					relationships[result.p.value][result.rl.value] = result.r.value;
				});
				onSuccess(relationships);
			}, onFail, true));
	},

	// Fetch incoming relationships of a resource with given uri
	getIncomingRelationshipsByUri : function (uri, onSuccess, onFail) {
		var query = [
			"SELECT (?relationship AS ?r) (?relationship_label AS ?rl) (?property AS ?p)",
			"WHERE {",
			"?property ?relationship <" + uri + "> .",
			"?property rdfs:label ?property_label .",
			"?relationship rdfs:label ?relationship_label .",
			"FILTER regex(?relationship,'dbpedia.org','i')",
			"FILTER (langMatches(lang(?property_label),'en')).",
			"FILTER (langMatches(lang(?relationship_label),'en')).",
			"}"
		].join(" ");

		// Hack for delaying queries
		enqueueQuery(
			// Execute query
			sparqlQueryJson.bind(this, query, this.sparqlEndpoint, function (results) {
				// Format query
				var relationships = {};
				results.results.bindings.map(function (result) {
					if (!relationships[result.p.value]) {
						relationships[result.p.value] = {};
					}
					relationships[result.p.value][result.rl.value] = result.r.value;
				});
				onSuccess(relationships);
			}, onFail, true));
	},

	// Fetch incoming relationships of a resource with given uri
	getTypeByUri : function (uri, onSuccess, onFail) {
		var query = [
			"PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
			"SELECT DISTINCT (?type_label AS ?tl) (?type AS ?t)",
			"WHERE {",
			"<" + uri + "> rdf:type ?type .",
			"?type rdfs:label ?type_label .",
			"FILTER regex(?type,'dbpedia.org','i')",
			"FILTER (langMatches(lang(?type_label),'en')).",
			"}"
		].join(" ");

		// Hack for delaying queries
		enqueueQuery(
			// Execute query
			sparqlQueryJson.bind(this, query, this.sparqlEndpoint, function (results) {
				// Format query
				var types = results;
				// results.results.bindings.map(function(result){
				//   if(!relationships[result.p.value]) {
				//     relationships[result.p.value] = {};
				//   }
				//   relationships[result.p.value][result.rl.value] = result.r.value;
				// });
				onSuccess(types);
			}, onFail, true));
	},
	
	getLocationByUri : function (uri, onSuccess, onFail){
		var query = [
			"PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>",
			"PREFIX dbo: <http://dbpedia.org/ontology/>",
			"SELECT ?lat ?lon WHERE {",
			"<" + uri + "> rdf:type dbo:Place ;",
			"geo:lat ?lat ;",
			"geo:long ?lon .",
			"}"
		].join(" ");
		
		// Hack for delaying queries
		enqueueQuery(
			// Execute query
			sparqlQueryJson.bind(this, query, this.sparqlEndpoint, function (results) {
				geodata = []
				results.results.bindings.map(function (result) {
					geodata.push([result.lat.value, result.lon.value])
				});
				onSuccess(geodata);
			}, onFail, true));
		
	},
	
	/*getThumbnailByUri : function (uri, onSuccess, onFail){
		var query = [
			"PREFIX dbo: <http://dbpedia.org/ontology/>",
			"SELECT ?thumbnail WHERE {",
			"<" + uri + "> dbo:thumbnail ?thumbnail .",
			"}"
		].join(" ");
		
		// Hack for delaying queries
		enqueueQuery(
			// Execute query
			sparqlQueryJson.bind(this, query, this.sparqlEndpoint, function (results) {
				geodata = []
				results.results.bindings.map(function (result) {
					geodata.push([result.lat.value, result.long.value])
				});
				onSuccess(geodata);
			}, onFail, true));
	},*/
	
	getImagesByUri : function (uri, onSuccess, onFail, type_only){
		
		//default value
		if (typeof(type_only)==='undefined') type_only = false;
		
		var query;
		//find things with image property
		if(type_only){
			query = [
				"PREFIX dbp: <http://dbpedia.org/property/>",
				"SELECT ?img WHERE {",
				"<" + uri + "> dbp:image ?img .",
				"}"
			].join(" ");
		}
		else{
		//find things with image in name / also get thumbnail
			query = [
				"SELECT DISTINCT ?rl ?p ?tn WHERE {{",
				"<" + uri + "> ?r ?p.",
				"FILTER regex(?r, '(.*)image(.*)', 'i')",
				"?r rdfs:label ?rl .",
				"}UNION{",
				"<" + uri + "> dbo:thumbnail ?tn.}}",
			].join(" ");
		}
		
		// Hack for delaying queries
		enqueueQuery(
			// Execute query
			sparqlQueryJson.bind(this, query, this.sparqlEndpoint, function (results) {
				
				//format: 
				"https://en.wikipedia.org/wiki/File:Togato_con_tesa_dell%27imperatore_claudio,_inv._2221.JPG"
				
				console.log(results);
				//onSuccess(results);
			}, onFail, true));
	},
	
	
	
	getTimeDataByUri : function(uri, onSuccess, onFail, type_only){
		
		//default value
		if (typeof(type_only)==='undefined') type_only = false;
		
		var query;
		
		if(type_only){
		//find things using the date notation
			query = [
				"SELECT DISTINCT ?r ?p",
				"WHERE { <" + uri + "> ?r ?p.",
				"?r rdfs:range xsd:date .",
				"FILTER regex(?r,'dbpedia.org','i')",
				"}"
			].join(" ");
		}else{
		//find things with date/year in name that may not be using the notation
			query = [
				"SELECT DISTINCT ?rl ?p",
				"WHERE {",
				"<" + uri + "> ?r ?p.",
				"FILTER regex(?r, '(.*)date(.*)|(.*)year(.*)', 'i')",
				"?r rdfs:label ?rl .",
				"FILTER regex(?r,'dbpedia.org','i')",
				"FILTER (langMatches(lang(?rl),'en')).",
				"}"
			].join(" ");
		}
		
		// Hack for delaying queries
		enqueueQuery(
			// Execute query
			sparqlQueryJson.bind(this, query, this.sparqlEndpoint, function (results) {
				timedata = []
				results.results.bindings.map(function (result) {
					timedata.push([result.rl.value, result.p.value])
				});
				onSuccess(timedata);
			}, onFail, true));
	},
	
	getAllData : function(uri, onSuccess, onFail){
		var query = [
			"SELECT DISTINCT (?r as ?relationship) (?rl as ?relationship_label) (?p as ?property) (?rl2 as ?time_label) (?p2 as ?time_value) ?lat ?lon (?desc as ?description) (?abs as ?abstract) ?name ?thumbnail ?image_label ?image_value",
			"WHERE {{",
			"<" + uri + "> ?r ?p.",
			"?p rdfs:label ?pl.",
			"?r rdfs:label ?rl.",
			"FILTER regex(?r,'dbpedia.org','i').",
			"FILTER (langMatches(lang(?pl),'en')).",
			"FILTER (langMatches(lang(?rl),'en')).",
			"}UNION{",
			"<" + uri + "> ?r2 ?p2.",
			"FILTER regex(?r2, '(.*)date(.*)|(.*)year(.*)', 'i')",
			"?r2 rdfs:label ?rl2 .",
			"FILTER regex(?r2,'dbpedia.org','i')",
			"FILTER (langMatches(lang(?rl2),'en')).",
			"}UNION{",
			"<" + uri + "> rdf:type dbo:Place ;",
			"geo:lat ?lat ;",
			"geo:long ?lon .",
			"}UNION{",
			"<" + uri + "> <http://www.w3.org/2000/01/rdf-schema#comment> ?desc",
			"FILTER (langMatches(lang(?desc),'en'))",
			"}UNION{",
			"<" + uri + "> rdfs:label ?name.",
			"<" + uri + "> dbo:abstract ?abs.",
			"FILTER (langMatches(lang(?name),'en')).",
			"FILTER (langMatches(lang(?abs),'en')).",
			"}UNION{",
			"<" + uri + "> dbo:thumbnail ?thumbnail.",
			"}}"
		].join(" ");
	
		// Hack for delaying queries
		enqueueQuery(
			// Execute query
			sparqlQueryJson.bind(this, query, this.sparqlEndpoint, function (result) {
				page = uri.split('/').pop().trim();
				
				https://en.wikipedia.org/wiki/Lazio
				
				$.getJSON(
					"http://en.wikipedia.org/w/api.php?action=parse&format=json&callback=?",
					{page:page, prop:"text"},
					function(data) {
						
						var relationships = [];
						var geodata = [];
						var timedata = [];
						var description = "";
						var abstrct = "";
						var thumbnail = "";
						var pictures = [];
						var label = "";
						
						if(data.parse === undefined){
							if(onFail !== undefined){
								onFail();
							}
							return;
							
						}
						
						html = data.parse.text['*'].replace(/img/g, 'noloadimg');
						tmp = $(html);
						tmp.find('.image noloadimg').each(function(){
							var x = $(this);
							var url = 'https:' + x.attr('src');
							url = url.split('/').slice(0,9);//remove any thumbnail specs
							url.splice(5,1);
							pictures.push({
								url : url.join('/'),
								label : x.attr('alt')
							});
						});
						
						result.results.bindings.map(function(obj){
							if(obj.property){
								if (!relationships[obj.property.value]) {
									relationships[obj.property.value] = {};
								}
								relationships[obj.property.value][obj.relationship_label.value] = obj.relationship.value;
							}
							else if(obj.time_label){
								timedata.push({label:obj.time_label.value, value:obj.time_value.value});
							}
							else if(obj.lat){
								geodata.push({lat:obj.lat.value, lon:obj.lon.value});
							}
							else if(obj.thumbnail){
								thumbnail = obj.thumbnail.value;
							}
							else if(obj.description){
								description = obj.description.value;
							}
							else if(obj.abstract){
								abstrct = obj.abstract.value;
								label = obj.name.value;
							}
						});	

						retobj = {
							description : abstrct,
							speak : description,
							relationships : relationships,
							geodata : geodata,
							timedata : timedata,
							thumbnail : thumbnail,
							pictures : pictures,
							label : label
						};
						onSuccess(retobj);	
				
					});
				

				/*
				
				
				
				//get list of all images on wiki page
				$.ajax({
					dataType : 'json', // no CORS
					url : 'https://en.wikipedia.org/w/api.php',
					data : {
						action : 'query',
						prop : 'images',
						format : 'json',
						titles : page,
						generator : 'images',
						gimlimit : '500'
					},
					success : function (imagedata) {
						
						console.log(imagedata);
						
						var relationships = [];
						var geodata = [];
						var timedata = [];
						var description = "";
						var abstrct = "";
						var thumbnail = "";
						var pictures = [];
						var label = "";
						
						var endfunc = function (imagedata) {
							if(imagedata){
								var keys = Object.keys(imagedata.query.pages);
								for(var i=0; i<keys.length; i++){
									var tmp = imagedata.query.pages[keys[i]].imageinfo[0];
									pictures.push({
										url : tmp.url,
										description_url : tmp.descriptionurl,
										short_description_url : tmp.descriptionshorturl
									});
								}
							}
							result.results.bindings.map(function(obj){
								if(obj.property){
									if (!relationships[obj.property.value]) {
										relationships[obj.property.value] = {};
									}
									relationships[obj.property.value][obj.relationship_label.value] = obj.relationship.value;
								}
								else if(obj.time_label){
									timedata.push({label:obj.time_label.value, value:obj.time_value.value});
								}
								else if(obj.lat){
									geodata.push({lat:obj.lat.value, lon:obj.lon.value});
								}
								else if(obj.thumbnail){
									thumbnail = obj.thumbnail.value;
								}
								else if(obj.description){
									description = obj.description.value;
								}
								else if(obj.abstract){
									abstrct = obj.abstract.value;
									label = obj.name.value;
								}
							});	

							retobj = {
								description : abstrct,
								speak : description,
								relationships : relationships,
								geodata : geodata,
								timedata : timedata,
								thumbnail : thumbnail,
								pictures : pictures,
								label : label
							};
							onSuccess(retobj);								
						}
						
						var keys = Object.keys(imagedata.query.pages);
						var tmp = imagedata.query.pages[keys[0]].images;
						if(tmp){
							titles = []
							for(var i=0; i<tmp.length; i++){
								titles.push(tmp[i].title.replace(/ /g,"_"));//replace spaces with underscores
							}
							//get actual urls of all images on wiki page
							$.ajax({
								dataType : 'json', // no CORS
								url : "https://en.wikipedia.org/w/api.php",
								data : {
									action : 'query',
									prop : 'imageinfo',
									iiprop : 'url',
									format : 'json',
									titles : titles.join("|")
								},
								success : endfunc
							});	
						}else{
							endfunc();
						}						
					}
				});*/
			}, onFail, true));
			
			
	},
	
	
	
	

	// Fetch Wikipedia's infobox widget
	getInfobox : function (page, onSuccess, onFail) {
		$.ajax({
			dataType : 'json', // no CORS
			url : 'https://en.wikipedia.org/w/api.php',
			data : {
				action : 'query',
				prop : 'revisions',
				rvprop : 'content',
				format : 'json',
				rvsection : '0', // infobox
				rvparse : '', // convert to HTML
				redirects : '', // follow title redirects
				titles : page
			},
			success : function (data) {
				var keys = Object.keys(data.query.pages);
				var content = data.query.pages[keys[0]].revisions[0]['*'].replace(/\[.*\d.*\]/g, ''); // Remove references
				onSuccess(content);
			}
		});
	},

	// Helper to format abstract, removing references and sentences in parenthesis
	getFormattedDescription : function (text) {
		return text;
		//.replace(/\[.*\d.*\]/g, '')
		//.replace(/\(.*\)/g, '');
	},

	// Helper to get first sentence from abstract (description)
	getFirstSentence : function (text) {
		if (text.match(/^(.*?)[.?!]\s/)){
			return text.match(/^(.*?)[.?!]\s/)[1] + ".";
		}
		//if (text.match(/(^.*?[a-z]{2,}[.!?])\s+\W*[A-Z]/)) {
		//	return text.match(/(^.*?[a-z]{2,}[.!?])\s+\W*[A-Z]/)[1];
		//}
		return text;
	}

}
