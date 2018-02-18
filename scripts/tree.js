var ck_api = 'https://api.cryptokitties.co/kitties/';
var activityTimeout = 4500;
var updatePeriod = 3500;

getTimeStamp = () => Math.floor(Date.now());
growl429 = () => {$.growlUI('Still fetching kitties', 'Please be patient!'); console.log("429 error");}
deepClone = (o) => (o == undefined) ? {} : JSON.parse(JSON.stringify(o));

var prevActivity = false;
stillActive = () => {
    var curActivity = getTimeStamp() - lastActivity < activityTimeout;
    var activity = (curActivity || prevActivity);
    prevActivity = curActivity;
    return activity;
}

var kittyId = prompt("Please enter the kitty id: ", "101");
var kittyCnt = 0;
var kittyLimit = 2500;
var lastActivity = getTimeStamp();

function cooldownStr(cooldown) {
    switch (cooldown) {
        case 1:
            return "Fast (1 min)";
        case 2:
            return "Swift (2 min)";
        case 3:
            return "Swift (5 min)";
        case 4:
            return "Snappy (10 min)";
        case 5:
            return "Snappy (30 min)";
        case 6:
            return "Brisk (1 hour)";
        case 7:
            return "Brisk (2 hours)";
        case 8:
            return "Plodding (4 hours)";
        case 9:
            return "Plodding (8 hours)";
        case 10:
            return "Slow (16 hours)";
        case 11:
            return "Slow (24 hours)";
        case 12:
            return "Sluggish (2 days)";
        case 13:
            return "Sluggish (4 days)";
        case 14:
            return "Catatonic (1 week)";
    }
}

// create entry for our tree
function buildNode(data)
{
    return {
        'id': data['id'],
        'name': (data['name'] == null) ? "Kitty #" + data['id'] : data['name'],
        'bio': generateBio(data),
        'image': data['image_url'],
        'jewels': getJewels(data),
        'children': getChildren(data)
    }
}

function getJewels(data) {
    var jewels = {'diamond':[], 'gold':[], 'purple':[], 'blue':[]};

    data['enhanced_cattributes'].forEach( (c) => {
        if (c['position'] == -1)
            return;
        if (c['position'] == 1) { // TODO: finish
            jewels['diamond'].push({'description': c['description']});
        } else if (c['position'] < 11) {
            jewels['gold'].push({'description': c['description']});
        } else if (c['position'] < 101) {
            jewels['purple'].push({'description': c['description']});
        } else if (c['position'] < 501) {
            jewels['blue'].push({'description': c['description']});
        }
    });

    return jewels;
}

// TODO: make better...
function generateBio(data) {
    var birthday = new Date(data['created_at']).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
    var bio = `<div id="stats"><div class="stats">Birthday: ${birthday}</div> <div class="stats">Gen: ${data['generation']}</div> <div class="stats">Cooldown: ${cooldownStr(data['status']['cooldown_index'])}</div></div>`
    bio += `<div>${data['bio']}</div>`;
    var geneLink = `https://kittycalc.co/read/?k1=${data['id']}&k2=1`
    // NOTE: use div for link?
    return bio + `<div id="links"><a href="${geneLink}" target="_blank"><img class="kittycalc" src="images/kittycalc.png"></a></div>`;
}

function getChildren(parent) {
    var children = [];
    lastActivity = getTimeStamp();

    function fetchChildData(child){
        var url = ck_api + child['id'].toString();
        (function fetch() {
            $.getJSON(url, function(data) { children.push(buildNode(data)); })
             .fail(function( jqxhr, textStatus, error ) {
                if (jqxhr.status == 429) { // Too Many Requests
                    lastActivity = getTimeStamp() + 61000;
                    growl429();
                    setTimeout(fetch, 61000);
                } else if (jqxhr.status == 500) { // Internal error
                    setTimeout(fetch, 500);
                } else {
                    console.log(jqxhr);
                }
             });
        })();
    }

    parent['children'].forEach((child) => {
        kittyCnt++
        if (kittyCnt < kittyLimit)
            fetchChildData(child);
        else
            console.log("Kitty limit reached!!!");
    });
    return children; //NOTE: will be updated
}

// Setup keyboard interfacing
document.addEventListener("keydown", function(event) {
    //console.log(event.which);
    switch (event.which) {
        case 71:
            console.log("You just pressed g!");
            break;
    }
});

var tree;
var updateLoop;
// !!!START!!!
$(document).ready(function() {
    drawTree(tree); // TODO: revist this timing...

    // init
    var url = ck_api + kittyId.toString();
    initInterface();

    // kick off recursive calls and tree updates
    $.getJSON(url, function(data) {
        //data is the JSON string
        tree = buildNode(data);

        updateLoop = setTimeout(treeUpdateLoop, 500);
        checkIfDone();
    });
});


function initInterface() {
    // set values
    $('input[name="kittyLimit"]').val(kittyLimit);
    $('input[name="centerOnUpdate"]').prop('checked', centerOnUpdate);

    // set listeners
    $('input[name="kittyLimit"]').on('change', (e) => kittyLimit = e.currentTarget.value);
    $('button[name="goToKitty"]').on('click', () => {
        var goToID = prompt("Please enter the kitty id: ");
        centerNode(d3tree.nodes(root).find((d) => d.id == goToID));
    });
    $('input[name="centerOnUpdate"]').on('change', (e) => centerOnUpdate = e.currentTarget.checked);
}

function treeUpdateLoop() {
    console.log(`Kitty count: ${kittyCnt}`);
    setRoot(tree);
    if (centerOnUpdate)
        updateAndCenter(root);
    else
        update(root);

    updateLoop = setTimeout(treeUpdateLoop, updatePeriod); // NOTE: use updateLoop?
}

function checkIfDone() {
  if (stillActive())
  {
    setTimeout(checkIfDone, activityTimeout);
  }
  else
  {
    clearTimeout(updateLoop);
    //alert("ALL DONE!");
    //console.log("BANG! BANG! BANG! ALL DONE!");
  }
}

// Here lies modified descendant_tree code
var d3tree;
var root;
var svgGroup
// Misc. variables
var i = 0;
var maxDepth = 0;
var maxLabelLength = 28;
var transitionDuration = 350;
var first = true;
var vertical = false;
var diagonal, zoomListener;
var viewerWidth, viewerHeight;
var centerOnUpdate = true;

function drawTree(treeData) {

    // size of the diagram
    viewerWidth = $(document).width();
    viewerHeight = $(document).height();

    d3tree = d3.layout.tree().size([viewerHeight, viewerWidth]);

    // define a d3 diagonal projection for use by the node paths later on.
    diagonal = d3.svg.diagonal().projection((d) => (vertical) ? [d.x, d.y] : [d.y, d.x]);

    // Define the zoom function for the zoomable tree
    zoom = () => svgGroup.attr("transform", `translate(${d3.event.translate})scale(${d3.event.scale})`);

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

    // TODO: figure out better way to wire ui... this is silly
    setCenterOnUpdate = (bool) => { centerOnUpdate = bool; $('input[name="centerOnUpdate"]').prop('checked', bool); }

    baseSvg.on("mousedown", () => setCenterOnUpdate(false));

    setRoot(treeData);

    // Layout the tree initially and center on the root node.
    updateAndCenter(root);

    // Show biography and picture on hover
    $("body").hoverIntent({
      over: function() {
        var bio = $(this).attr("title");
        var img = $(this).attr("href");
        var kid = $(this).attr("kid");
        $("#bio").html(`<div id="kittypic"><a href="https://www.cryptokitties.co/kitty/${kid}" target="_blank"><img src="${img}"></a></div> <div id="biotext">${bio}</div>`)
                 .addClass("has-image")
                 .fadeIn("fast");
      },
      // TODO: fadeOut...
      out: () => {}, // NOTE: eats some errors
      /*out: function() {
        $("#bio").fadeOut("fast");
      },*/
      selector: ".node image"
    });
}

function setRoot(treeData) {
    // Define (or update) the root
    var temp = deepClone(treeData);
    if (root) {
        temp.x = root.x;
        temp.y = root.y;
        temp.x0 = root.x0;
        temp.y0 = root.y0;
    } else {
        temp.x0 = viewerHeight / 2;
        temp.y0 = 0;
    }
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

    // Set widths & heights between levels based on maxLabelLength.
    nodes.forEach(function(d) {
      if (d.depth > maxDepth)
        maxDepth = d.depth;
      if (vertical) {
        d.y = (d.depth * (maxLabelLength * 5));
        d.x *= 3;
      } else {
        d.y = (d.depth * (maxLabelLength * 8));
        d.x *= 3;
      }
    });

    // Update the nodes…
    node = svgGroup.selectAll("g.node").data(nodes, (d) => d.id || (d.id = ++i) );

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
            if (vertical)
                return `translate(${source.x0},${source.y0})`;
            else
                return `translate(${source.y0},${source.x0})`;
        })
        .on('click', click);

    nodeEnter.append("circle")
             .attr('class', 'nodeCircle')
             .attr("r", 0)
             .style("fill", function(d) {
               return d._children ? "lightsteelblue" : "#fff";
             });

    if (vertical) {
      nodeEnter.append("text")
        .attr("y", (d) => d.children || d._children ? -18 : 18 )
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text( (d) => d.name )
        .style("fill-opacity", 1);
    } else {
      nodeEnter.append("text")
          .attr("x", -35)
          .attr("dy", ".35em")
          .attr('class', 'nodeText')
          .attr("text-anchor", "end")
          .text( (d) => d.name )
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
             .attr('kid', '')
             .attr("xlink:href", "")
             .attr("x", -40)
             .attr("y", -42)
             .attr("width", 85)
             .attr("height", 85);

    // Diamond (top left)


    // phantom node to give us mouseover in a radius around it
    nodeEnter.append("circle")
        .attr('class', 'ghostCircle')
        .attr("r", 35)
        .attr("opacity", 0.2) // change this to zero to hide the target area
        .style("fill", "red")
        .attr('pointer-events', 'mouseover')
        .on("mouseover", (n) => overCircle(node))
        .on("mouseout", (n) => outCircle(node));

    node.select('image').attr("xlink:href", (d) => (d.image) ? d.image : "https://www.cryptokitties.co/images/kitty-love-3.svg");
    node.select('image').attr("title", (d) => d.bio ? d.bio : "");
    node.select('image').attr("kid", (d) => d.id);


    // !*!*!*!*! Diamond (top left) !*!*!*!*!
    var diamonds = node.filter( (d) => 'jewels' in d && d['jewels']['diamond'].length > 0);
    diamonds.append("image")
        .attr("xlink:href", "https://www.cryptokitties.co/images/cattributes/diamond.svg")
        .attr("x", -32.5)
        .attr("y", -27)
        .attr('opacity', 0.85);
    diamonds.append('text')
        .attr("x", -22)
        .attr("y",-15)
        .attr("text-anchor", "middle")
        .style("class", "jewelnum")
        .text((d) => d['jewels']['diamond'].length);

    // !*!*!*!*! gilded (top right) !*!*!*!*!
    var golds = node.filter( (d) => 'jewels' in d && d['jewels']['gold'].length > 0);
    golds.append("image")
        .attr("xlink:href", "https://www.cryptokitties.co/images/cattributes/gold.svg")
        .attr("x", 9)
        .attr("y", -29.5)
        .attr('opacity', 0.85);
    golds.append('text')
        .attr("x", 21.5)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("class", "jewelnum")
        .text((d) => d['jewels']['gold'].length);

    // !*!*!*!*! amethyst (bottom left) !*!*!*!*!
    var purples = node.filter( (d) => 'jewels' in d && d['jewels']['purple'].length > 0);
    purples.append("image")
        .attr("xlink:href", "https://www.cryptokitties.co/images/cattributes/purple.svg")
        .attr("x", -34)
        .attr("y", 10)
        .attr('opacity', 0.85);
    purples.append('text')
        .attr("x", -22)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("class", "jewelnum")
        .text((d) => d['jewels']['purple'].length);

    // !*!*!*!*! lapis (bottom right) !*!*!*!*!
    var blues = node.filter( (d) => 'jewels' in d && d['jewels']['blue'].length > 0);
    blues.append("image")
        .attr("xlink:href", "https://www.cryptokitties.co/images/cattributes/blue.svg")
        .attr("x", 9)
        .attr("y", 10)
        .attr('opacity', 0.85);
    blues.append('text')
        .attr("x", 21.5)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("class", "jewelnum")
        .text((d) => d['jewels']['blue'].length);


    node.select('text').attr('x', -35).attr('text-anchor', 'end').text( (d) => d.name );

    // Change the circle fill depending on whether it has children and is collapsed
    node.select("circle.nodeCircle")
        .attr('r', 25)
        .style('fill', (d) => d._children ? "lightsteelblue" : "#fff");

    // Transition nodes to their new position.
    // NOTE: stretching x-axis
    var nodeUpdate = node.transition()
        .duration(transitionDuration)
        .attr("transform", function(d) {
            if (vertical)
                return `translate(${d.x},${d.y})`;
            else
                return `translate(${d.y},${d.x})`;
        });

    // Fade the text in
    nodeUpdate.select("text").style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
        .duration(transitionDuration)
        .attr("transform", function(d) {
            if (vertical)
                return `translate(${source.x},${source.y})`;
            else
                return `translate(${source.y},${source.x})`;
        }).remove();
    nodeExit.select("circle").attr("r", 0);
    nodeExit.select("text").style("fill-opacity", 0);

    // Update the links…
    var link = svgGroup.selectAll("path.link").data(links, (d) => d.target.id );

    getDiagonal = (d) => {
        var o = {
            x: source.x0,
            y: source.y0
        };
        return diagonal({
            source: o,
            target: o
        });
    }

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
        .attr("class", "link")
        .style('stroke-width', (d) => `${maxDepth - d.source.depth}px`)
        .attr("d", getDiagonal);

    // Transition links to their new position.
    link.transition().duration(transitionDuration).attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(transitionDuration)
        .attr("d", getDiagonal)
        .remove();

    // Stash the old positions for transition.
    nodes.forEach((d) => { d.x0 = d.x; d.y0 = d.y;});
}

function centerNode(source) {
    scale = zoomListener.scale();
    x = -source.y0;
    y = -source.x0;
    x = x * scale + viewerWidth / 2;
    y = y * scale + viewerHeight / 2;
    d3.select("g").transition()
        .duration(transitionDuration)
        .attr("transform", `translate(${x},${y})scale(${scale})`);
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