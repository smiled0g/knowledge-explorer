/* 
 * FeatureGraph builder in D3
 * The code is borrowed heavily from http://bl.ocks.org/robschmuecker/7880033
 */

var d3 = require('d3');

var isParent = function(d) {
  return d.relationship && d.relationship.type === 'parent';
}

module.exports = {
  draw: function(container, root) {
    
    // Count number of parents and neighbors
    var nParents = 0, nNeighbors = 0;
    
    // Prepare child nodes for tree structure (remove children)
    root.children.map(function(d){ 
      d.children = [];
      if(isParent(d)) { nParents++; } else { nNeighbors++; }
    });
    
    // Clear container
    $(container).empty();
    
    // Calculate dimension of the graph
    var m = [20, 120, 20, 120],
        renderWidth = 300,
        width = $(container).width(),
        height = $(container).height(),
        xGap = 50.0, // Gap between nodes in x-axis
        widthRatio = 0.6,
        heightRation = 0.6;
    
    // Center root node
    root.x0 = 0;
    root.y0 = 0;
    
    var xParent = (height / 2) - ((nParents-1) * xGap)/2; // Initial x-value for parents
    var xNeighbor = (height / 2) - ((nNeighbors-1) * xGap)/2; // Initial x-value for neighbors

    var cluster = d3.layout.tree()
        .size([height, renderWidth]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { 
          return [d.y/2*widthRatio, d.x]; 
        });
    
    // Define the zoom function for the zoomable tree
    function zoom() {
      var translate = d3.event.translate,
          scale = d3.event.scale;
      svg.attr("transform", "translate(" + translate + ")scale(" + d3.event.scale + ")");
    }
    
    // Define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior.zoom().translate([width/2,0]).scaleExtent([0.1, 3]).on("zoom", zoom);

    var svg = d3.select(container).append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(zoomListener)
      .append("g")
        .attr("transform", "translate("+width/2+", 0)");
    
    var nodes = cluster.nodes(root),
        links = cluster.links(nodes);
    
    // Position x-value of the nodes
    nodes.forEach(function(d){
      if(d == root) return;
      if(isParent(d)) {
        d.x = xParent;
        xParent += xGap;
      } else {
        d.x = xNeighbor;
        xNeighbor += xGap;
      }
    });

    var link = svg.selectAll(".link")
        .data(links)
      .enter().append("path")
        .attr("class", "link")
        .attr("transform", function(p) { 
          return isParent(p.target) ? "scale(-1,1)" : "";
        })
        .attr("d", diagonal)
        .each(function(p){
          p.target._path = this;
        });

    var node = svg.selectAll(".node")
        .data(nodes)
      .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { 
          if(isParent(d)) return "translate(" + -d.y/2*widthRatio + "," + d.x + ")";
          else return "translate(" + d.y/2*widthRatio + "," + d.x + ")"; 
        })
        .on("mouseover", function(d){
          d3.select(this).classed("highlight", true);    // Add 'highlight' class to node
          d3.select(d._path).classed("highlight", true); // Add 'highlight' class to path
          d3.select(this).select(".name-relationship")
            .transition()
            .duration(150)
            .ease("cubic-out")
            .attr("transform", "scale(1.2, 1.2)")
            .style("font-weight", "bold")
        })
        .on("mouseleave", function(d){
          d3.select(this).classed("highlight", false);    // Remove 'highlight' class from node
          d3.select(d._path).classed("highlight", false); // Remove 'highlight' class to path
          d3.select(this).select(".name-relationship")
            .transition()
            .duration(150)
            .ease("cubic-in")
            .attr("transform", "scale(1, 1)")
            .style("font-weight", "500")
        })
        .on("click", function(d) {
          $('[name="feature-select"]').val(d.id).trigger('change');
        });

    // Add circle
    node.append("circle")
        .attr("r", 6);
    
    // Add text group for holding children name and relationship
    var textGroup = node.append("g")
        .attr("class", "name-relationship");

    // Add name
    textGroup.append("text")
        .attr("dx", function(d) { return isParent(d) ? -10 : 10; })
        .attr("dy", 4)
        .attr("class", "name")
        .attr("font-size", 14)
        .style("text-anchor", function(d) { return isParent(d) ? "end" : "start"; })
        //.attr("transform",function(d) { return "rotate(-45)" })
        .text(function(d) { return d == root ? "" : d.name.eng; })
    
    // Add relationship
    textGroup.append("text")
        .attr("dx", function(d) { return isParent(d) ? -10 : 10; })
        .attr("dy", -10)
        .attr("class", "relationship")
        .attr("font-size", 11)
        .style("text-anchor", function(d) { return isParent(d) ? "end" : "start"; })
        //.attr("transform",function(d) { return "rotate(-45)" })
        .text(function(d) { return d == root ? "" : d.relationship.eng; });
        
  }
};