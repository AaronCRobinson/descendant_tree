var ck_api = 'https://api.cryptokitties.co/kitties/';
var timeout = 500;

getTimeSamp = () => Math.floor(Date.now());
stillActive = () => getTimeSamp()-lastActivity<timeout;

var kittyId = prompt("Please enter the kitty id: ", "101");
var lastActivity = getTimeSamp();

function getChildren(parent) {
    var children = [];
    lastActivity = getTimeSamp();
    parent['children'].forEach(function(child){
      url = ck_api + child['id'].toString();
      $.getJSON(url, function(data) {

      children.push({
        'name': (data['name'] == null) ? "Kitty #" + data['id'] : data['name'],
        'bio': data['bio'],
        'image': data['image_url'],
        'children': getChildren(data)
      });
    });
  });

  return children; //NOTE: will be updated
}

var tree;
$( document ).ready(function() {
    // START: with first
    url = ck_api + kittyId.toString();
    drawTree(tree);
    $.getJSON(url, function(data) {
    //data is the JSON string
    tree = {
        'name': data['name'],
        'bio': data['bio'],
        'image': data['image_url'],
        'children': getChildren(data)
    };
    checkIfDone();
    });
});

function checkIfDone() {
  if (stillActive())
  {
    setRoot(tree);
    updateAndCenter(root);
    setTimeout(checkIfDone, timeout);
  }

}

// Here lies modified descendant_tree code
var d3tree;
var root;
var svgGroup
// Misc. variables
var i = 0;
var maxDepth = 0;
var maxLabelLength = 25;
var transitionDuration = 250;
var vertical = false;
var diagonal, zoomListener;
var viewerWidth, viewerHeight;

function drawTree(treeData) {

    // size of the diagram
    viewerWidth = $(document).width();
    viewerHeight = $(document).height();

    d3tree = d3.layout.tree().size([viewerHeight, viewerWidth]);

    // define a d3 diagonal projection for use by the node paths later on.
    diagonal = d3.svg.diagonal().projection(function(d) {
      if (vertical)
        return [d.x, d.y];
      else
        return [d.y, d.x];
    });

    // Define the zoom function for the zoomable tree
    function zoom() {
      svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3.select("#tree-container").append("svg")
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay")
        .call(zoomListener);

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    svgGroup = baseSvg.append("g");

    setRoot(treeData);

    // Layout the tree initially and center on the root node.
    updateAndCenter(root);

    // Show biography and picture on hover
    $("body").hoverIntent({
      over: function() {
        var bio = $(this).attr("title");
        var img = $(this).attr("href");
        $("#bio").html("<img src='"+ $(this).attr("href") + "'>" + bio)
                 .addClass("has-image")
                 .fadeIn("fast");
      },
      out: function() {
        $("#bio").fadeOut("fast");
      },
      selector: ".node image"
    });
}

function setRoot(treeData) {
    // Define the root
    var temp = Object.assign({}, treeData);
    temp.x0 = viewerHeight / 2;
    temp.y0 = 0;
    root = temp;
}

function updateAndCenter(source) {
    update(source);
    centerNode(source);
}

function update(source) {
    // Compute the new height, function counts total children of root node and sets tree height accordingly.
    // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
    // This makes the layout more consistent.
    var levelWidth = [1];
    var childCount = function(level, n) {

        if (n.children && n.children.length > 0) {
            if (levelWidth.length <= level + 1) levelWidth.push(0);

            levelWidth[level + 1] += n.children.length;
            n.children.forEach(function(d) {
                childCount(level + 1, d);
            });
        }
    };
    childCount(0, root);
    var newHeight = d3.max(levelWidth) * 70; // 70 pixels per line
    d3tree = d3tree.size([newHeight, viewerWidth]);

    // Compute the new tree layout.
    var nodes = d3tree.nodes(root).reverse(),
        links = d3tree.links(nodes);

    // Set widths between levels based on maxLabelLength.
    nodes.forEach(function(d) {
      if (d.depth > maxDepth)
        maxDepth = d.depth;
      if (vertical)
        d.y = (d.depth * (maxLabelLength * 5));
      else
        d.y = (d.depth * (maxLabelLength * 8));
    });

    // Update the nodes…
    node = svgGroup.selectAll("g.node")
                   .data(nodes, function(d) {
                     return d.id || (d.id = ++i);
                   });

    console.log(node);

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
            if (vertical)
              return "translate(" + source.x0 + "," + source.y0 + ")";
            else
              return "translate(" + source.y0 + "," + source.x0 + ")";
        })
        .on('click', click);

    nodeEnter.append("circle")
             .attr('class', 'nodeCircle')
             .attr("r", 0)
             .style("fill", function(d) {
               return d._children ? "lightsteelblue" : "#fff";
             });

    function englishName (d) {
        return d["english-name"] ? d["english-name"] : d.name;
    }

    if (vertical) {
      nodeEnter.append("text")
        .attr("y", function(d) {
         return d.children || d._children ? -18 : 18; })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return englishName(d); })
        .style("fill-opacity", 1);
    } else {
      nodeEnter.append("text")
          .attr("x", function(d) {
            return -20;
          })
          .attr("dy", ".35em")
          .attr('class', 'nodeText')
          .attr("text-anchor", function(d) {
            return "end";
          })
          .text(function(d) {
            return englishName(d);
          })
          .style("fill-opacity", 0);
    }

    var overCircle = function(d) {
        selectedNode = d;
        updateTempConnector();
    };
    var outCircle = function(d) {
        selectedNode = null;
        updateTempConnector();
    };

    // append an image if one exists
    nodeEnter.append("image")
             .attr('title', '')
             .attr("xlink:href", "")
             .attr("x", -25)
             .attr("y", -25)
             .attr("width", 50)
             .attr("height", 50);

    // phantom node to give us mouseover in a radius around it
    nodeEnter.append("circle")
        .attr('class', 'ghostCircle')
        .attr("r", 30)
        .attr("opacity", 0.2) // change this to zero to hide the target area
    .style("fill", "red")
        .attr('pointer-events', 'mouseover')
        .on("mouseover", function(node) {
            overCircle(node);
        })
        .on("mouseout", function(node) {
            outCircle(node);
        });

    node.select('image').attr("xlink:href", function(d) {
      if (d.image)
        return d.image;
      else
        return "https://www.cryptokitties.co/images/kitty-love-3.svg";
    });
    node.select('image').attr("title", function(d) {
      return "<strong>" + englishName(d) + "</strong>. " + (d.bio ? d.bio : "");
    });

    // Update the text to reflect whether node has children or not.
    node.select('text')
        .attr("x", function(d) {
            //return d.children || d._children ? -10 : 10;
            return -20;
        })
        .attr("text-anchor", function(d) {
            //return d.children || d._children ? "end" : "start";
            return "end";
        })
        .text(function(d) {
            return englishName(d);
        });

    // Change the circle fill depending on whether it has children and is collapsed
    node.select("circle.nodeCircle")
        .attr("r", 18)
        .style("fill", function(d) {
            return d._children ? "lightsteelblue" : "#fff";
        });

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(transitionDuration)
        .attr("transform", function(d) {
            console.log("update");
            if (vertical)
              return "translate(" + d.x + "," + d.y + ")";
            else
              return "translate(" + d.y + "," + d.x + ")";
        });

    // Fade the text in
    nodeUpdate.select("text").style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
        .duration(transitionDuration)
        .attr("transform", function(d) {
            if (vertical)
              return "translate(" + source.x + "," + source.y + ")";
            else
              return "translate(" + source.y + "," + source.x + ")";
        }).remove();
    nodeExit.select("circle").attr("r", 0);
    nodeExit.select("text").style("fill-opacity", 0);

    // Update the links…
    var link = svgGroup.selectAll("path.link").data(links, function(d) { return d.target.id; });

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
        .attr("class", "link")
        .style('stroke-width', function(d) {return 3*(maxDepth - d.source.depth) + 'px';})
        .attr("d", function(d) {
            var o = {
                x: source.x0,
                y: source.y0
            };
            return diagonal({
                source: o,
                target: o
            });
        });

    // Transition links to their new position.
    link.transition().duration(transitionDuration).attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(transitionDuration)
        .attr("d", function(d) {
            var o = {
                x: source.x,
                y: source.y
            };
            return diagonal({
                source: o,
                target: o
            });
        })
        .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

function centerNode(source) {
    scale = zoomListener.scale();
    x = -source.y0;
    y = -source.x0;
    x = x * scale + viewerWidth / 2;
    y = y * scale + viewerHeight / 2;
    d3.select("g").transition()
        .duration(transitionDuration)
        .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
    //zoomListener.scale(scale);
    zoomListener.translate([x, y]);
}

// Toggle children function
function toggleChildren(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else if (d._children) {
        d.children = d._children;
        d._children = null;
    }
    return d;
}

// Toggle children on click.
function click(d) {
    if (d3.event.defaultPrevented) return; // click suppressed
    d = toggleChildren(d);
    updateAndCenter(d);
}