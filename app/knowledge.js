/*
 **  Helper that holds information represented in Knowledge Graph
 */

var Knowledge = {

  // Initialze an onject that holds graph information
  init: function() {
    window.knowledge_graph =
      {
        "config": {
          "title" : "Knowledge Graph",
          "graph" : {
              "linkDistance" : 125,
              "charge"       : -5000,
              "friction"     : 0.7,
              "gravity"      : 0.2,
              "height"       : 800,
              "numColors"    : 12,
              "labelPadding" : {
                "left"   : 3,
                "right"  : 3,
                "top"    : 2,
                "bottom" : 2
              },
              "labelMargin" : {
                "left"   : 3,
                "right"  : 3,
                "top"    : 2,
                "bottom" : 2
              },
              "ticksWithoutCollisions" : 50
            },
            "types" : {
              "group0" : {
                  "short" : "Undefined group",
                  "long"  : "Undefined group"
              },
            },
            "constraints" : []
          },
          "graph": {}, // URI -> Obj within graph
          "refs": {}, // Number -> Obj within graph
          "refCount": 1,

      };
  },

  // Return current knowledge graph
  getGraph: function() {
    if(!window.knowledge_graph) this.init();
    return window.knowledge_graph
  },

  // Return name of a node to display in D3 graph
  getNodeName: function(ref, name) {
    return ref + " | " + name;
  },

  // Return resource's uri from that resource's reference number
  getUriFromRef: function(ref) {
    return this.getGraph().refs[ref];
  },

  // Return resource's uri from that resource's name
  getUriFromName: function(name) {
    var graph = this.getGraph().graph;
    for(var uri in graph) {
      if(graph[uri].name.toLowerCase().indexOf(name.toLowerCase()) >= 0)
        return uri;
    }
  },

  // Return resource's uri from that resource's reference number or name
  getUriFromRefOrName: function(str) {
    if(parseInt(str)) {
      return this.getUriFromRef(parseInt(str));
    } else {
      return this.getUriFromName(str);
    }
  },

  // Add a node to knowledge graph
  addNode: function(uri, name, relationships, redraw) {
    var graph = this.getGraph();
    if(graph.graph[uri]) return false;

    var ref = graph.refCount++;
    var nodeName = this.getNodeName(ref, name);
    var node =
    {
      "name": nodeName,
      "type": "group3",
      "depends": [],
      "dependedOnBy": [],
      "relationships": relationships || [],
      "ref": ref,
      "docs":""
    }

    graph.refs[ref] = uri;
    graph.graph[uri] = node;

    // Add links
    for(rel_uri in relationships) {
      if(graph.graph[rel_uri]) this.addLink(uri, rel_uri);
    }
    for(node_uri in graph.graph) {
      for(rel_uri in graph.graph[node_uri].relationships) {
        if(rel_uri === uri) this.addLink(node_uri, uri);
      }
    }

    if(redraw) {
      this.drawGraph();
    }

    return ref;
  },

  // Remove a node from knowledge graph (not yet implemented)
  removeNode: function(uri, redraw) {
    var graph = this.getGraph();

    if(redraw) {
      this.drawGraph();
    }
  },

  // Add relationship to knowledge graph
  addLink: function(uri_from, uri_to, relationship, redraw) {
    var graph = this.getGraph();

    // Add link in graph, and add relationship if not present
    if(graph.graph[uri_from] && graph.graph[uri_to]) {
      if(graph.graph[uri_from].dependedOnBy.indexOf(uri_to) < 0) {
        graph.graph[uri_from].dependedOnBy.push(uri_to);
      }
      if(graph.graph[uri_to].depends.indexOf(uri_from) < 0) {
        graph.graph[uri_to].depends.push(uri_from);
      }
    }

    if(redraw) {
      this.drawGraph();
    }
  },

  // Remove relationship from knowledge graph
  removeLink: function(uri_from, uri_to, redraw) {
    var graph = this.getGraph();

    // Remove link from graph, but preserve relationship
    if(graph.graph[uri_from] && graph.graph[uri_to]) {
      if(graph.graph[uri_from].dependedOnBy.indexOf(uri_to) >= 0) {
        graph.graph[uri_from].dependedOnBy.splice(
          graph.graph[uri_from].dependedOnBy.indexOf(uri_to)
        );
      }
      if(graph.graph[uri_to].depends.indexOf(uri_from) >= 0) {
        graph.graph[uri_to].depends.splice(
          graph.graph[uri_to].depends.indexOf(uri_from)
        );
      }
    }

    if(redraw) {
      this.drawGraph();
    }
  },

  // Trigger D3 graph to redraw using current knowledge graph data
  drawGraph: function() {
    $(document).trigger('drawGraph');
  }

}

module.exports = Knowledge;
