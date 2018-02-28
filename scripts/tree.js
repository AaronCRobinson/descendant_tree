var STAGGERN = 4; // delay for each node
var STAGGERD = 200; // delay for each depth
var HAS_CHILDREN_COLOR = 'lightsteelblue';
var SELECTED_COLOR = '#a00';  // color of selected node
var DURATION = 700; // d3 animation duration

var treeData; // json data containing tree structure
var curNode;  // currently selected node
var transitionDuration;


var ck_api = 'https://api.cryptokitties.co/kitties/';
var activityTimeout = 4500;
var updatePeriod = 3500;



var showJewels = false;

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
    var node =
    {
        'id': data['id'],
        'name': (data['name'] == null) ? "Kitty #" + data['id'] : data['name'],
        'bio': generateBio(data),
        'image': data['image_url'],
        'jewels': getJewels(data),
        'kids': [] // temp location to avoid empty list bugs]
    }

    //var children = [];
    lastActivity = getTimeStamp();

    function fetchChildData(child){
        var url = ck_api + child['id'].toString();
        (function fetch() {
            $.getJSON(url, function(data) {
                if (node.kids)
                {
                    node.kids.push(buildNode(data));
                    node.children = node.kids;
                    delete node.kids;
                }
                else
                    node.children.push(buildNode(data));
            }).fail(function( jqxhr, textStatus, error ) {
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

    data['children'].forEach((child) => {
        kittyCnt++
        if (kittyCnt < kittyLimit)
            fetchChildData(child);
        else
            console.log("Kitty limit reached!!!");
    });

    return node;
}

// TODO: make better...
function generateBio(data) {
    var birthday = new Date(data['created_at']).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
    var bio = `<div id="stats"><div class="stats">Birthday: ${birthday}</div>  <div class="stats">Gen: ${data['generation']}</div> <div class="stats">Cooldown: ${cooldownStr(data['status']['cooldown_index'])}</div></div>`
    bio += `<div>${data['bio']}</div>`;
    // NOTE: use div for link?
    return `${bio}<div id="links"><a href="https://kittycalc.co/read/?k1=${data['id']}&k2=1" target="_blank"><img class="kittycalc" src="images/kittycalc.png"></a></div>`;
}

function getJewels(data) {
    var jewels = {'diamond':[], 'gold':[], 'purple':[], 'blue':[]};

    data['enhanced_cattributes'].forEach( (c) => {
        if (c['position'] == -1)
            return;
        if (c['position'] == 1) { // TODO: finish
            jewels['diamond'].push(c);
        } else if (c['position'] < 11) {
            jewels['gold'].push(c);
        } else if (c['position'] < 101) {
            jewels['purple'].push(c);
        } else if (c['position'] < 501) {
            jewels['blue'].push(c);
        }
    });

    return jewels;
}

/*function getChildren(parentData, parentNode) {
    var children = [];
    lastActivity = getTimeStamp();

    function fetchChildData(child){
        var url = ck_api + child['id'].toString();
        (function fetch() {
            $.getJSON(url, function(data) {
                children.push(buildNode(data));
            }).fail(function( jqxhr, textStatus, error ) {
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
}*/

// Setup keyboard interfacing
document.addEventListener("keydown", function(event) {
    //console.log(event.which);
    switch (event.which) {
        case 71:
            console.log("You just pressed g!");
            break;
    }
});

var updateLoop;
// !!!START!!!
$(document).ready(function() {
    // init
    var url = ck_api + kittyId.toString();
    initInterface();

    // kick off recursive calls and tree updates
    $.getJSON(url, function(data) {
        treeData = buildNode(data);  // init tree data
        drawTree();
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
    $('input[name="centerOnUpdate"]').on('change', (e) => centerOnUpdate = e.currentTarget.checked);

    $('button[name="goToKitty"]').on('click', () => {
        var goToID = prompt("Please enter the kitty id: ");
        console.log("not implemented!");
        //centerNode(d3tree.nodes(root).find((d) => d.id == goToID));
    });

}

function treeUpdateLoop() {
    console.log(`Kitty count: ${kittyCnt}`);

    // TODO: double check this is necessary
    // update root using a new tree from treeData
    var newTree = d3tree(d3.hierarchy(treeData));
    root = Object.assign(newTree, root);

    if (centerOnUpdate)
        updateAndCenter(root);
    else
        update(root);

    updateLoop = setTimeout(treeUpdateLoop, updatePeriod); // NOTE: use updateLoop?
}

function checkIfDone() {
  if (stillActive())
    setTimeout(checkIfDone, activityTimeout);
  else
    clearTimeout(updateLoop);
}

// Here lies modified descendant_tree code
var d3tree;
var root;
var svgGroup
// Misc. variables
var i = 0;
var maxDepth = 0;
var maxLabelLength = 30;
var nodeRadius = 29;
var first = true;
var zoomListener;
var viewerWidth, viewerHeight, center;
var currentScale
var centerOnUpdate = true;
var selectedKittyID;
var gnode;

var stratify;

var kittyUrl = 'https://www.cryptokitties.co/kitty/'

function drawTree() {

    // size of the diagram
    viewerWidth = $(document).width();
    viewerHeight = $(document).height();
    center = { x: viewerWidth/2, y: viewerHeight/2 };

    //d3tree = d3.tree().size([viewerHeight, viewerWidth]);

    d3tree = d3.tree()
        .size([2 * Math.PI, viewerWidth])
        //.nodeSize([500, 00])
        .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

    // Define the zoom function for the zoomable tree
    zoom = () => {
        var transform = d3.event.transform;
        svgGroup.attr("transform", `translate(${[transform.x, transform.y]})scale(${transform.k})`);
    }

    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    zoomListener = d3.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

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

    console.log(d3.hierarchy(treeData));

    // Layout the tree initially and center on the root node.
    root = d3tree(d3.hierarchy(treeData));
    updateAndCenter(root);

    handleNodePic = (n) => {
        var bio = n.attr("title");
        var img = n.attr("href");
        var kid = n.attr("kid");
        $("#mainbio").html(`<div id="kittypic"><a href="${kittyUrl}${kid}" target="_blank"><img src="${img}"></a></div> <div id="biotext">${bio}</div>`);
        selectedKittyID = kid;
    }

    // Show biography and picture on hover
    $("body").hoverIntent({
      over: function() {
          $("#bio").fadeIn("fast");
          var self = $(this);
          switch (self.attr("class")) {

              case "gempic":
                var img = self.attr("href");
                var gemtype = self.attr("gemtype");
                // move node to parent and grab jewels
                self = d3.select(this.parentNode).select("image.nodepic");

                var jewels = self.data()[0].data.jewels;
                var jewelInfo = "";
                jewels[gemtype].forEach((d) => {
                    // TODO: pictures should link some better way than this..
                    jewelInfo += `<div id="familyJewels"><div id="gemPosition">${d.position}</div><a href="${kittyUrl}${d.kittyId}" target="_blank"><img src="https://storage.googleapis.com/ck-kitty-image/0x06012c8cf97bead5deae237070f9587f8e7a266d/${d.kittyId}.svg"></a><div id="gemDescription">${d.description}</div></div>`
                });
                handleNodePic(self); // NOTE: make sure the kitty node is shown...
                $("#subbio").html(`<div id="gemPic"><img src="${img}"></div> <div id="gemDetails">${jewelInfo}</div>`);
                $("#subbio").fadeIn("fast");
                break;

              case "nodepic":
                if (selectedKittyID != self.attr("kid"))
                {
                    $("#subbio").fadeOut("fast");
                    handleNodePic(self);
                }
                break;
          }

      },
      // TODO: fadeOut...
      out: () => {}, // NOTE: eats some errors
      /*out: function() {
        $("#bio").fadeOut("fast");
      },*/
      selector: ".node image"
    });
}

function updateAndCenter(source) {
    update(source);
    centerNode(source);
}

function update(source) {

    var transitionDuration = d3.event && d3.event.altKey ? DURATION * 4 : DURATION;

    // Compute the new height, function counts total children of root node and sets tree height accordingly.
    // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
    // This makes the layout more consistent.
    /*var levelWidth = [1];
    var childCount = function(level, n) {

        if (n.children && n.children.length > 0) {
            if (levelWidth.length <= level + 1) levelWidth.push(0);

            levelWidth[level + 1] += n.children.length;
            n.children.forEach( (d) => childCount(level + 1, d) );
        }
    };
    childCount(0, root);
    var newHeight = d3.max(levelWidth) * 70; // 70 pixels per line
    d3tree = d3tree.size([newHeight, viewerWidth]);*/

    /*var levelWidth = [1];
    var childCount = function(level, n) {

        if (n.children && n.children.length > 0) {
            if (levelWidth.length <= level + 1) levelWidth.push(0);

            levelWidth[level + 1] += n.children.length;
            n.children.forEach( (d) => childCount(level + 1, d) );
        }
    };
    childCount(0, root);
    var newHeight = d3.max(levelWidth) * 350; // 70 pixels per line
    d3tree = d3tree.size([newHeight, viewerWidth]);
    console.log(newHeight);*/

    // NOTE: ACR restruct levelWidth with cummulative nature
    /*var cnt = 0;
    for (i = 0; i < levelWidth.length; i++) {
        cnt += levelWidth[i];
        levelWidth[i] = cnt;
    }
    console.log(levelWidth);*/

    //if (!('id' in root)) return;

    // Compute the new tree layout.
    var nodes = root.descendants(),
        links = root.links();

    // TODO: return to transforming tree into natural tree-like shape

    // Set widths & heights between levels based on maxLabelLength.
    nodes.forEach(function(d) {
        if (d.depth > maxDepth)
            maxDepth = d.depth;
        //d.y *= 0.45; //(d.depth * (maxLabelLength * 10.5));
        //d.y *= 0.5 * Math.pow(levelWidth[d.depth], 1/(d.depth+1)); //d.children ? d.children.length : 1;
        // d.x *= 2 * (d.parent ? d.parent.children.length : 1);
        //console.log(d.id);
        //d.y *= d.depth/4 + 0.5;
        //d.x =(d.x + (2 * Math.PI)) / 3; //(d.x + (3 * Math.PI)) / 4;
        //d.x = d.x / 2 + Math.PI /2;
        //d.x /= 2;
    });

    gnode = svgGroup.selectAll("g.node").data(nodes, (d) => d.id || (d.id = ++i) );

    nodeEntry(source);

    // NOTE: not quite sure why this is required...
    gnode = svgGroup.selectAll("g.node").data(nodes, (d) => d.id || (d.id = ++i) );

    // Change the circle fill depending on whether it has children and is collapsed
    gnode.select('circle.nodeCircle')
        .attr('r', nodeRadius)
        .style('fill', (d) => d._children ? HAS_CHILDREN_COLOR : 'white')
        .attr('stroke', (d) => d.selected ? SELECTED_COLOR : 'steelblue')
        .attr('stroke-width', (d) => d.selected ? 3 : 1.5);

    gnode.select('text.nodeText')
        .attr("x", 0)
        .attr("y", -35 )
        .attr("dy", "0em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1);

    // Transition nodes to their new position.
    // NOTE: stretching x-axis
    var nodeUpdate = gnode.transition()
        .duration(transitionDuration)
        .attr("transform", (d) => `translate(${radialPoint(d.x, d.y)})` );

    // Fade the text in
    nodeUpdate.select("text").style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = gnode.exit().transition()
        .duration(transitionDuration)
        .attr('transform', () => `translate(${radialPoint(source.x, source.y)})`).remove();
    nodeExit.select('circle').attr('r', 0);
    nodeExit.select('text').style('fill-opacity', 0);

    // Update the links…
    var link = svgGroup.selectAll("path.link").data(links, (d) => d.id );

    linkRadial = d3.linkRadial().angle( (d) => d.x ).radius( (d) => d.y );

    // Enter any new links at the parent's previous position.
    link.enter().insert('path', 'g')
        .attr('class', 'link')
        .style('stroke-width', (d) => `${2 * (maxDepth - d.source.depth)}px`)
        .attr('d', linkRadial);

    // Transition links to their new position.
    link.transition().duration(transitionDuration)
        .delay( (d, i) => i * STAGGERN + Math.abs(d.source.depth - curNode.depth) * STAGGERD ).attr("d", linkRadial);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(transitionDuration)
        .attr("d", linkRadial)
        .remove();

    // Stash the old positions for transition.
    nodes.forEach((d) => { d.x0 = d.x; d.y0 = d.y;});
}

function nodeEntry(source) {
    // Enter any new nodes at the parent's previous position.
    var nodeEnter = gnode.enter().insert('g', ':first-child')
        .attr('class', 'node')
        .attr("transform", (d) => `translate(${radialPoint(d.x, d.y)})` )
        .on('click', click); // TODO: more stuff

    nodeEnter.append('circle')
             .attr('class', 'nodeCircle')
             .attr('r', 1e-6)
             .style("fill", (d) => d._children ? "lightsteelblue" : "#fff"); // TODO: fill color for node

    nodeEnter.append("text")
             .attr('class', 'nodeText')
             .text( (d) => d.data.name );

    nodeEnter.append("image")
             .attr('title', (d) => d.data.bio)
             .attr('kid', (d) => d.data.id)
             .attr("xlink:href", (d) => (d.data) ? d.data.image : "https://www.cryptokitties.co/images/kitty-love-3.svg")
             .attr("class", "nodepic")
             .attr("x", -40)
             .attr("y", -42)
             .attr("width", 85)
             .attr("height", 85);

    if (!showJewels) return;

    // !*!*!*!*! Diamond (top left) !*!*!*!*!
    var diamonds = nodeEnter.filter( (d) => d.data.jewels.diamond.length > 0);
    diamonds.append("image")
        .attr("xlink:href", "https://www.cryptokitties.co/images/cattributes/diamond.svg")
        .attr("x", -32.5)
        .attr("y", -27)
        .attr('opacity', 0.85)
        .attr("class", "gempic")
        .attr("gemtype", "diamond");
    diamonds.append('text')
        .attr("x", -22)
        .attr("y",-15)
        .attr("text-anchor", "middle")
        .style("class", "jewelnum")
        .text((d) => d.data.jewels.diamond.length);

    // !*!*!*!*! gilded (top right) !*!*!*!*!
    var golds = nodeEnter.filter( (d) => d.data.jewels.gold.length > 0);
    golds.append("image")
        .attr("xlink:href", "https://www.cryptokitties.co/images/cattributes/gold.svg")
        .attr("x", 9)
        .attr("y", -29.5)
        .attr('opacity', 0.85)
        .attr("class", "gempic")
        .attr("gemtype", "gold");
    golds.append('text')
        .attr("x", 21.5)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("class", "jewelnum")
        .text((d) => d.data.jewels.gold.length);

    // !*!*!*!*! amethyst (bottom left) !*!*!*!*!
    var purples = nodeEnter.filter( (d) => d.data.jewels.purple.length > 0);
    purples.append("image")
        .attr("xlink:href", "https://www.cryptokitties.co/images/cattributes/purple.svg")
        .attr("x", -34)
        .attr("y", 10)
        .attr('opacity', 0.85)
        .attr("class", "gempic")
        .attr("gemtype", "purple");
    purples.append('text')
        .attr("x", -22)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("class", "jewelnum")
        .text((d) => d.data.jewels.purple.length);

    // !*!*!*!*! lapis (bottom right) !*!*!*!*!
    var blues = nodeEnter.filter( (d) => d.data.jewels.blue.length > 0);
    blues.append("image")
        .attr("xlink:href", "https://www.cryptokitties.co/images/cattributes/blue.svg")
        .attr("x", 9)
        .attr("y", 10)
        .attr('opacity', 0.85)
        .attr("class", "gempic")
        .attr("gemtype", "blue");
    blues.append('text')
        .attr("x", 21.5)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("class", "jewelnum")
        .text((d) => d.data.jewels.blue.length);
}

// highlight selected node
function selectNode(node) {
    if (curNode) delete curNode.selected;
    curNode = node;
    curNode.selected = true;
    curPath = []; // filled in by fullpath
    d3.select('#selection').html(fullpath(node));
}

// for displaying full path of node in tree
function fullpath(d, idx) {
    idx = idx || 0;
    curPath.push(d);
    return (d.parent ? fullpath(d.parent, curPath.length) : '') +
        '/<span class="nodepath'+(d.name === root.name ? ' highlight' : '')+
        '" data-sel="'+ idx +'" title="Set Root to '+ d.name +'">' +
        d.name + '</span>';
}

function radialPoint(x, y) {
    //return [(y = +y) * Math.cos(x -= Math.PI / 2), y * Math.sin(x)];
    return [(y = +y) * Math.cos(x -= Math.PI / 2), y * Math.sin(x)];
}

function centerNode(source) {
    selectNode(root);
    // TODO: !!!
    //scale = ;
    //x = -source.x0;
    //y = -source.y0;
    //x = x * currentScale + center.x;
    //y = y * currentScale + center.y;
    //d3.select("g").transition().duration(transitionDuration).attr('transform', `translate(${x},${y})scale(${currentScale})`);
    //zoomListener.translate([x, y]);
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