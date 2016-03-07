/*
 **  Helper that contains multiple DBPedia/Wikipedia query functions
 */

var $ = require('jquery'),
    infobox = require('wiki-infobox-parser');

// Hack for delaying queries
var queryQueue = [],
    queryDelay = 50, // process query every 50ms
    processQueriesTimer = null;

function enqueueQuery(queryFn) {
  // Push query into queue
  queryQueue.push(queryFn);
  // Process query if there's no query/delayed query being placed
  if(!processQueriesTimer) {
    processQueriesTimer = setTimeout(processQueries, queryDelay);
  }
}

function processQueries() {
  if(queryQueue.length === 0) return;
  // Pop query from queue
  var queryFn = queryQueue.shift();
  // Schedule for processing next query
  if(queryQueue.length > 0) {
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

  var querypart = "query=" + encodeURIComponent(queryStr);

  // Get our HTTP request object.
  var xmlhttp = null;
  if(window.XMLHttpRequest) {
    xmlhttp = new XMLHttpRequest();
  } else if(window.ActiveXObject) {
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
  xmlhttp.onreadystatechange = function() {
   if(xmlhttp.readyState == 4) {
     if(xmlhttp.status == 200) {
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
  sparqlEndpoint: "http://dbpedia.org/sparql/",
  keywordLookupUrl: "http://lookup.dbpedia.org/api/search/KeywordSearch",

  // Seach for DBPedia resources by a given keyword
  searchByKeyword: function(keyword, onSuccess, onFail, limit) {
    $.getJSON(
      this.keywordLookupUrl,
      { QueryString: keyword, MaxHits: (limit || 10) },
      function(data){ return onSuccess(data.results); },
      onFail
    );
  },

  getAbstractByUriAndLanguage: function(uri, lang, onSuccess, onFail) {
    var query = [
       "PREFIX dbpedia: <http://dbpedia.org/resource/>",
       "SELECT ?name ?abs",
       "WHERE {",
          "<" + uri + "> rdfs:label ?name.",
          "<" + uri + "> dbo:abstract ?abs.",
          "FILTER (langMatches(lang(?name),'"+ lang + "')).",
          "FILTER (langMatches(lang(?abs),'"+ lang + "')).",
       "}"
      ].join(" ");

    // Hack for delaying queries
    enqueueQuery (
      sparqlQueryJson.bind(this, query, this.sparqlEndpoint, onSuccess, onFail, true)
    );
  },

  // Fetch properties of a particular type of a resource with given uri
  getRelationshipsOfTypeByUri: function(uri, type, onSuccess, onFail) {
    // Get peoperties but NOT relationships
    var query = [
      "SELECT DISTINCT ?property ?property_label",
      "WHERE {",
         "<" + uri + "> ?relationship ?property .",
         "?property rdfs:label ?property_label .",
         "?property rdf:type ?type",
         "FILTER regex(?type,'dbpedia.org\/ontology\/"+type+"','i')",
         "FILTER regex(?relationship,'dbpedia.org','i')",
         "FILTER (langMatches(lang(?property_label),'en')).",
      "}"
    ].join(" ");

    // Hack for delaying queries
    enqueueQuery (
      // Execute query
      sparqlQueryJson.bind(this,query, this.sparqlEndpoint, function(results) {
        // Format query
        var list = {};
        results.results.bindings.map(function(r){
          list[r.property.value] = r.property_label.value;
        });
        onSuccess(list);
      }, onFail, true)
    );
  },

  // Fetch properties and relationships of a resource with given uri
  getRelationshipsByUri: function(uri, onSuccess, onFail) {
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
    enqueueQuery (
      // Execute query
      sparqlQueryJson.bind(this, query, this.sparqlEndpoint, function(results) {
        // Format query
        var relationships = {};
        results.results.bindings.map(function(result){
          if(!relationships[result.p.value]) {
            relationships[result.p.value] = {};
          }
          relationships[result.p.value][result.rl.value] = result.r.value;
        });
        onSuccess(relationships);
      }, onFail, true)
    );
  },

  // Fetch incoming relationships of a resource with given uri
  getIncomingRelationshipsByUri: function(uri, onSuccess, onFail) {
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
    enqueueQuery (
      // Execute query
      sparqlQueryJson.bind(this, query, this.sparqlEndpoint, function(results) {
        // Format query
        var relationships = {};
        results.results.bindings.map(function(result){
          if(!relationships[result.p.value]) {
            relationships[result.p.value] = {};
          }
          relationships[result.p.value][result.rl.value] = result.r.value;
        });
        onSuccess(relationships);
      }, onFail, true)
    );
  },

  // Fetch Wikipedia's infobox widget
  getInfobox: function(page, onSuccess, onFail) {
    $.ajax({
      dataType: 'json', // no CORS
      url: 'https://en.wikipedia.org/w/api.php',
      data: {
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        format: 'json',
        rvsection: '0', // infobox
        rvparse: '', // convert to HTML
        redirects: '', // follow title redirects
        titles: page
      },
      success: function(data) {
        var keys = Object.keys(data.query.pages);
        var content = data.query.pages[keys[0]].revisions[0]['*'].replace(/\[.*\d.*\]/g,''); // Remove references
        onSuccess(content);
      }
    });
  },

  // Helper to format abstract, removing references and sentences in parenthesis
  getFormattedDescription: function(text) {
    return text
            .replace(/\[.*\d.*\]/g,'')
            .replace(/\(.*\)/g,'');
  },

  // Helper to get first sentence from abstract (description)
  getFirstSentence: function(text) {
    if(text.match(/(^.*?[a-z]{2,}[.!?])\s+\W*[A-Z]/)) {
      return text.match(/(^.*?[a-z]{2,}[.!?])\s+\W*[A-Z]/)[1];
    }
    return text;
  }

}
