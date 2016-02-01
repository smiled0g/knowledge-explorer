var Knowledge = {
  init: function() {
    window.knowledge_graph =
      {
        "config": {
          "title" : "Knowledge Graph",
          "graph" : {
              "linkDistance" : 150,
              "charge"       : -400,
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

  getGraph: function() {
    if(!window.knowledge_graph) this.init();
    return window.knowledge_graph
  },

  getNodeName: function(ref, name) {
    return ref + " | " + name;
  },

  getUriFromRef: function(ref) {
    return this.getGraph().refs[ref];
  },

  getUriFromName: function(name) {
    var graph = this.getGraph().graph;
    for(var uri in graph) {
      if(graph[uri].name.toLowerCase().indexOf(name.toLowerCase()) >= 0)
        return uri;
    }
  },

  getUriFromRefOrName: function(str) {
    if(parseInt(str)) {
      return this.getUriFromRef(parseInt(str));
    } else {
      return this.getUriFromName(str);
    }
  },

  addNode: function(uri, name, relationships, redraw) {
    var graph = this.getGraph();
    if(graph.graph[uri]) return;

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

  removeNode: function(uri, redraw) {
    var graph = this.getGraph();

    if(redraw) {
      this.drawGraph();
    }
  },

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

  drawGraph: function() {
    $(document).trigger('drawGraph');
  }

}

module.exports = Knowledge;
