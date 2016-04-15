/*
 **  Graph controller
 */

var d3 = require('d3');

module.exports = function(data) {
    var graph       = { data: data.graph },
        config      = data.config,
        selected    = {},
        highlighted = null,
        isIE        = false,
        container   = '#graph';

    function run() {
        resize();

        drawGraph();

        $('#docs-close').on('click', function() {
            deselectObject();
            return false;
        });

        $(document).on('click', '.select-object', function() {
            var obj = graph.data[$(this).data('name')];
            if (obj) {
                selectObject(obj);
            }
            return false;
        });

        $(document).on('drawGraph', function() {
          drawGraph();
        });

        $(window).on('resize', resize);
    }

    function drawGraph() {
        $('#graph').empty();

        graph.margin = {
            top    : 0,
            right  : 0,
            bottom : 0,
            left   : 0
        };

        var display = $('#graph').css('display');
        $('#graph')
            .css('display', 'block')
            .css('height', '100%');
        graph.width  = $('#graph').width()  - graph.margin.left - graph.margin.right;
        graph.height = $('#graph').height() - graph.margin.top  - graph.margin.bottom;
        $('#graph').css('display', display);

        for (var name in graph.data) {
            var obj = graph.data[name];
            obj.positionConstraints = [];
            obj.linkStrength        = 1;

            config.constraints.forEach(function(c) {
                for (var k in c.has) {
                    if (c.has[k] !== obj[k]) {
                        return true;
                    }
                }

                switch (c.type) {
                    case 'position':
                        obj.positionConstraints.push({
                            weight : c.weight,
                            x      : c.x * graph.width,
                            y      : c.y * graph.height
                        });
                        break;

                    case 'linkStrength':
                        obj.linkStrength *= c.strength;
                        break;
                }
            });
        }

        graph.links = [];
        for (var name in graph.data) {
            var obj = graph.data[name];
            for (var depIndex in obj.depends) {
                var link = {
                    source : graph.data[obj.depends[depIndex]],
                    target : obj
                };
                link.strength = (link.source.linkStrength || 1)
                              * (link.target.linkStrength || 1);
                graph.links.push(link);
            }
        }

        graph.categories = {};
        for (var name in graph.data) {
            var obj = graph.data[name],
                key = obj.type + ':' + (obj.group || ''),
                cat = graph.categories[key];

            obj.categoryKey = key;
            if (!cat) {
                cat = graph.categories[key] = {
                    key      : key,
                    type     : obj.type,
                    typeName : (config.types[obj.type]
                                ? config.types[obj.type].short
                                : obj.type),
                    group    : obj.group,
                    count    : 0
                };
            }
            cat.count++;
        }
        graph.categoryKeys = d3.keys(graph.categories);

        graph.colors = colorbrewer.Set3[config.graph.numColors];

        function getColorScale(darkness) {
            return d3.scale.ordinal()
                .domain(graph.categoryKeys)
                .range(graph.colors.map(function(c) {
                    return d3.hsl(c).darker(darkness).toString();
                }));
        }

        graph.strokeColor = getColorScale( 0.7);
        graph.fillColor   = getColorScale(-0.1);

        graph.nodeValues = d3.values(graph.data);

        graph.force = d3.layout.force()
            .nodes(graph.nodeValues)
            .links(graph.links)
            .linkStrength(function(d) { return d.strength; })
            .size([graph.width, graph.height])
            .linkDistance(config.graph.linkDistance)
            .charge(config.graph.charge)
            .gravity(config.graph.gravity)
            .friction(config.graph.friction)
            .on('tick', tick);

        graph.svg = d3.select('#graph').append('svg')
            .attr('width' , graph.width  + graph.margin.left + graph.margin.right)
            .attr('height', graph.height + graph.margin.top  + graph.margin.bottom)
            .call(d3.behavior.zoom().on("zoom", function () {
              d3.select('#graph > svg > g').attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
            }))
          .append('g')
            .attr('transform', 'translate(' + graph.margin.left + ',' + graph.margin.top + ')');

        graph.svg.append('defs').selectAll('marker')
            .data(['end'])
          .enter().append('marker')
            .attr('id'          , String)
            .attr('viewBox'     , '0 -5 10 10')
            .attr('refX'        , 10)
            .attr('refY'        , 0)
            .attr('markerWidth' , 6)
            .attr('markerHeight', 6)
            .attr('orient'      , 'auto')
          .append('path')
            .attr('d', 'M0,-5L10,0L0,5');

        // adapted from http://stackoverflow.com/questions/9630008
        // and http://stackoverflow.com/questions/17883655

        var glow = graph.svg.append('filter')
            .attr('x'     , '-50%')
            .attr('y'     , '-50%')
            .attr('width' , '200%')
            .attr('height', '200%')
            .attr('id'    , 'blue-glow');

        glow.append('feColorMatrix')
            .attr('type'  , 'matrix')
            .attr('values', '0 0 0 0  0 '
                          + '0 0 0 0  0 '
                          + '0 0 0 0  .7 '
                          + '0 0 0 1  0 ');

        glow.append('feGaussianBlur')
            .attr('stdDeviation', 3)
            .attr('result'      , 'coloredBlur');

        glow.append('feMerge').selectAll('feMergeNode')
            .data(['coloredBlur', 'SourceGraphic'])
          .enter().append('feMergeNode')
            .attr('in', String);

        graph.line = graph.svg.append('g').selectAll('.link')
            .data(graph.force.links())
          .enter().append('line')
            .attr('class', 'link');

        $('#graph-container').on('click', function(e) {
            if (!$(e.target).closest('.node').length) {
                deselectObject();
            }
        });

        graph.node = graph.svg.selectAll('.node')
            .data(graph.force.nodes())
          .enter().append('g')
            .attr('class', 'node')
            .on('click', function(d) {
              selectObject(d, this);
            })

        graph.nodeRect = graph.node.append('rect')
            .attr('rx', 5)
            .attr('ry', 5)
            .attr('stroke', function(d) {
                return graph.strokeColor(d.categoryKey);
            })
            .attr('fill', function(d) {
                return '#fff'//graph.fillColor(d.categoryKey);
            })
            .attr('width' , 120)
            .attr('height', 30);

        graph.node.each(function(d) {
            var node  = d3.select(this),
                rect  = node.select('rect'),
                lines = wrap(d.name),
                ddy   = 1.1,
                dy    = -ddy * lines.length / 2 + .5;

            // Populate node's heat by log of degree of the node
            d.heat = Math.log(d.depends.length + d.dependedOnBy.length)/Math.log(10);

            lines.forEach(function(line) {
                var text = node.append('text')
                    .text(line)
                    .attr('dy', dy + 'em');
                dy += ddy;
            });
        });


        // Calculate max heat for normalizing heatmap color
        var maxHeat = 0;
        graph.node.each(function(d) {
          maxHeat = d.heat > maxHeat ? d.heat : maxHeat;
        });
        // Assign color to node with normalized heatmap
        graph.node.each(function(d) {
          d3.select(this).select('rect').attr("fill", heatMapColorforValue(d.heat/maxHeat));
        });

        setTimeout(function() {
            graph.node.each(function(d) {
                var node   = d3.select(this),
                    text   = node.selectAll('text'),
                    bounds = {},
                    first  = true;

                text.each(function() {
                    var box = this.getBBox();
                    if (first || box.x < bounds.x1) {
                        bounds.x1 = box.x;
                    }
                    if (first || box.y < bounds.y1) {
                        bounds.y1 = box.y;
                    }
                    if (first || box.x + box.width > bounds.x2) {
                        bounds.x2 = box.x + box.width;
                    }
                    if (first || box.y + box.height > bounds.y2) {
                        bounds.y2 = box.y + box.height;
                    }
                    first = false;
                }).attr('text-anchor', 'middle');

                var padding  = config.graph.labelPadding,
                    margin   = config.graph.labelMargin,
                    oldWidth = bounds.x2 - bounds.x1;

                bounds.x1 -= oldWidth / 2;
                bounds.x2 -= oldWidth / 2;

                bounds.x1 -= padding.left;
                bounds.y1 -= padding.top;
                bounds.x2 += padding.left + padding.right;
                bounds.y2 += padding.top  + padding.bottom;

                node.select('rect')
                    .attr('x', bounds.x1)
                    .attr('y', bounds.y1)
                    .attr('width' , bounds.x2 - bounds.x1)
                    .attr('height', bounds.y2 - bounds.y1);

                d.extent = {
                    left   : bounds.x1 - margin.left,
                    right  : bounds.x2 + margin.left + margin.right,
                    top    : bounds.y1 - margin.top,
                    bottom : bounds.y2 + margin.top  + margin.bottom
                };

                d.edge = {
                    left   : new geo.LineSegment(bounds.x1, bounds.y1, bounds.x1, bounds.y2),
                    right  : new geo.LineSegment(bounds.x2, bounds.y1, bounds.x2, bounds.y2),
                    top    : new geo.LineSegment(bounds.x1, bounds.y1, bounds.x2, bounds.y1),
                    bottom : new geo.LineSegment(bounds.x1, bounds.y2, bounds.x2, bounds.y2)
                };
            });

            graph.numTicks = 0;
            graph.preventCollisions = false;
            graph.force.start();
            for (var i = 0; i < config.graph.ticksWithoutCollisions; i++) {
                graph.force.tick();
            }
            graph.preventCollisions = true;
            // force tick to prevent animation
            for (var k=0;(graph.force.alpha() > 1e-2) && (k < 150); k++) {
                graph.force.tick();
            }
            graph.force.stop();
            $('#graph-container').css('visibility', 'visible');
        });
    }

    function heatMapColorforValue(value){
      var h = (1.0 - value) * 240
      return d3.hsl("hsl(" + h + ", 100%, 50%)").brighter(1.5).toString();
    }

    var maxLineChars = 26,
        wrapChars    = ' /_-.'.split('');

    function wrap(text) {
        if (text.length <= maxLineChars) {
            return [text];
        } else {
            for (var k = 0; k < wrapChars.length; k++) {
                var c = wrapChars[k];
                for (var i = maxLineChars; i >= 0; i--) {
                    if (text.charAt(i) === c) {
                        var line = text.substring(0, i + 1);
                        return [line].concat(wrap(text.substring(i + 1)));
                    }
                }
            }
            return [text.substring(0, maxLineChars)]
                .concat(wrap(text.substring(maxLineChars)));
        }
    }

    function preventCollisions() {
        var quadtree = d3.geom.quadtree(graph.nodeValues);

        for (var name in graph.data) {
            if(!graph.data[name].extent) {
                console.log('Graph error:', name, graph.data[name]);
                continue;
            }
            var obj = graph.data[name],
                ox1 = obj.x + obj.extent.left,
                ox2 = obj.x + obj.extent.right,
                oy1 = obj.y + obj.extent.top,
                oy2 = obj.y + obj.extent.bottom;

            quadtree.visit(function(quad, x1, y1, x2, y2) {
                if (quad.point && quad.point !== obj) {
                    // Check if the rectangles intersect
                    var p   = quad.point,
                        px1 = p.x + p.extent.left,
                        px2 = p.x + p.extent.right,
                        py1 = p.y + p.extent.top,
                        py2 = p.y + p.extent.bottom,
                        ix  = (px1 <= ox2 && ox1 <= px2 && py1 <= oy2 && oy1 <= py2);
                    if (ix) {
                        var xa1 = ox2 - px1, // shift obj left , p right
                            xa2 = px2 - ox1, // shift obj right, p left
                            ya1 = oy2 - py1, // shift obj up   , p down
                            ya2 = py2 - oy1, // shift obj down , p up
                            adj = Math.min(xa1, xa2, ya1, ya2);

                        if (adj == xa1) {
                            obj.x -= adj / 2;
                            p.x   += adj / 2;
                        } else if (adj == xa2) {
                            obj.x += adj / 2;
                            p.x   -= adj / 2;
                        } else if (adj == ya1) {
                            obj.y -= adj / 2;
                            p.y   += adj / 2;
                        } else if (adj == ya2) {
                            obj.y += adj / 2;
                            p.y   -= adj / 2;
                        }
                    }
                    return ix;
                }
            });
        }
    }

    function tick(e) {
        graph.numTicks++;

        for (var name in graph.data) {
            var obj = graph.data[name];

            obj.positionConstraints.forEach(function(c) {
                var w = c.weight * e.alpha;
                if (!isNaN(c.x)) {
                    obj.x = (c.x * w + obj.x * (1 - w));
                }
                if (!isNaN(c.y)) {
                    obj.y = (c.y * w + obj.y * (1 - w));
                }
            });
        }

        if (graph.preventCollisions) {
            preventCollisions();
        }

        graph.line
            .attr('x1', function(d) {
                return d.source.x;
            })
            .attr('y1', function(d) {
                return d.source.y;
            })
            .each(function(d) {
                if (isIE) {
                    // Work around IE bug regarding paths with markers
                    // Credit: #6 and http://stackoverflow.com/a/18475039/106302
                    this.parentNode.insertBefore(this, this);
                }

                if(d.source.x === d.target.x && d.source.y === d.target.y) return;

                var x    = d.target.x,
                    y    = d.target.y,
                    line = new geo.LineSegment(d.source.x, d.source.y, x, y);

                for (var e in d.target.edge) {
                    var ix = line.intersect(d.target.edge[e].offset(x, y));
                    if (ix.in1 && ix.in2) {
                        x = ix.x;
                        y = ix.y;
                        break;
                    }
                }

                d3.select(this)
                    .attr('x2', x)
                    .attr('y2', y);
            });

        graph.node
            .attr('transform', function(d) {
                if(d.x && d.y) return 'translate(' + d.x + ',' + d.y + ')';
                return '';
            });
    }

    function selectObject(obj, el) {
        var node;
        if (el) {
            node = d3.select(el);
        } else {
            graph.node.each(function(d) {
                if (d === obj) {
                    node = d3.select(el = this);
                }
            });
        }
        if (!node) return;

        if (node.classed('selected')) {
            deselectObject();
            return;
        }
        deselectObject(false);

        selected = {
            obj : obj,
            el  : el
        };

        highlightObject(obj);

        node.classed('selected', true);
        // $('#docs').html(obj.docs);
        // $('#docs-container').scrollTop(0);
        resize(true);

        // var $graph   = $('#graph-container'),
        //     nodeRect = {
        //         left   : obj.x + obj.extent.left + graph.margin.left,
        //         top    : obj.y + obj.extent.top  + graph.margin.top,
        //         width  : obj.extent.right  - obj.extent.left,
        //         height : obj.extent.bottom - obj.extent.top
        //     },
        //     graphRect = {
        //         left   : $graph.scrollLeft(),
        //         top    : $graph.scrollTop(),
        //         width  : $graph.width(),
        //         height : $graph.height()
        //     };
        // if (nodeRect.left < graphRect.left ||
        //     nodeRect.top  < graphRect.top  ||
        //     nodeRect.left + nodeRect.width  > graphRect.left + graphRect.width ||
        //     nodeRect.top  + nodeRect.height > graphRect.top  + graphRect.height) {
        //
        //     $graph.animate({
        //         scrollLeft : nodeRect.left + nodeRect.width  / 2 - graphRect.width  / 2,
        //         scrollTop  : nodeRect.top  + nodeRect.height / 2 - graphRect.height / 2
        //     }, 500);
        // }

    }

    function deselectObject(doResize) {
        if (doResize || typeof doResize == 'undefined') {
            resize(false);
        }
        graph.node.classed('selected', false);
        selected = {};
        highlightObject(null);
    }

    function highlightObject(obj) {
        if (obj) {
            if (obj !== highlighted) {
                graph.node.classed('inactive', function(d) {
                    return (obj !== d
                         && d.depends.indexOf(obj.uri) == -1
                         && d.dependedOnBy.indexOf(obj.uri) == -1);
                });
                graph.line.classed('inactive', function(d) {
                    return (obj !== d.source && obj !== d.target);
                });
            }
            highlighted = obj;
        } else {
            if (highlighted) {
                graph.node.classed('inactive', false);
                graph.line.classed('inactive', false);
            }
            highlighted = null;
        }
    }

    var showingDocs       = false,
        docsClosePadding  = 8,
        desiredDocsHeight = 300;

    function resize() {
        $('#graph > svg')
          .attr('height', $('#graph').height())
          .attr('width', $('#graph').width());
    }

    // Debug
    window.graph = {
      data: data,
      graph: graph,
      draw: drawGraph
    }

    // Return object containing access to functions inside
    return {
      run: run
    }
}
