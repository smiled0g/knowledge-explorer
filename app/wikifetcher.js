var $ = require('jquery');

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

  var querypart = "query=" + escape(queryStr);

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
  searchByKeyword: function(keyword, onSuccess, onFail, limit) {
    $.getJSON(
      this.keywordLookupUrl, 
      { QueryString: keyword, MaxHits: (limit || 5) },
      function(data){ return onSuccess(data.results); },
      onFail
    );
  },
  
  getAbstractByName: function(keyword, onSuccess, onFail) {
    var query = [
       "PREFIX dbpedia: <http://dbpedia.org/resource/>",
       "SELECT ?name ?abs ?chi",
       "WHERE {",
          "<http://dbpedia.org/resource/" + keyword + "> rdfs:label ?name.",
          "<http://dbpedia.org/resource/" + keyword + "> dbo:abstract ?abs.",
          "<http://dbpedia.org/resource/" + keyword + "> dbo:abstract ?chi.",
          "FILTER (langMatches(lang(?name),'en')).",
          "FILTER (langMatches(lang(?abs),'en')).",
          "FILTER (langMatches(lang(?chi),'zh')).",
       "}"
      ].join(" ");
    sparqlQueryJson(query, this.sparqlEndpoint, onSuccess, onFail, true);
  },
  
  describe: function(keyword, onSuccess, onFail) {
    $.getJSON(
      this.sparqlEndpoint, 
      { 
        "default-graph-uri": "http://dbpedia.org", 
        "query": "DESCRIBE+" + "<http://dbpedia.org/resource/" + keyword + ">",
        "output": "application/microdata+json"
      },
      function(data){ return onSuccess(data.results); },
      onFail
    );
  }
}