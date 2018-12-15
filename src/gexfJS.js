(function() {

    /**
     * GEXF Parser working also with dynamic networks
     *
     * Author: eren-ck (Eren Cakmak)
     * URL:https://github.com/eren-ck/gexfJS
     * Licensed under the MIT License
     */

    // Root object, `window` = browser, or `exports` = server.
    var root = this;

    // Create a safe reference to the lib object for use below.
    var gexf = function(obj) {
        if (obj instanceof gexf) return obj;
        if (!(this instanceof gexf)) return new gexf(obj);
        this.libwrapped = obj;
    };

    // Export the lib object for **Node.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `gexf` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = gexf;
        }
        exports.gexf = gexf;
    } else {
        root.gexf = gexf;
    }

    // Current version.
    gexf.VERSION = '0.1.0';
    gexf.parse = parse;

    /**
     * Graph class.
     * An class which contains the graph with optional elements
     */
    class Graph {

        /**
         * Graph constructor
         * @param {object} graphContent   object of graph contents
         * @param {object} meta   meta data inforamtion of the xml file
         */
        constructor(graphContent, meta) {
            // set graph content
            this.mode = graphContent.mode;
            this.defaultedgetype = graphContent.defaultedgetype;
            this.idtype = graphContent.idtype;
            // set the meta data
            this.meta = meta;
        }

        /**
         * Set the graph node properties
         * @param  {Nodes} nodes    Array of nodes
         */
        setNodes(nodes) {
            this.nodes = nodes;
        }

        /**
         * Set the graph edge properties
         * @param  {Edges} edges    Array of edges
         */
        setEdges(edges) {
            this.edges = edges;
        }

        /**
         * Set the graph attribute properties
         * @param  {Attribute} attributes    Array of attributes
         */
        setAttributes(attributes) {
            this.attributes = attributes;
        }

        /**
         * Set the dynamic graph properties
         * @param  {object} prop    Array of properties
         */
        setDynamicMetaData(prop) {
            this.timeformat = prop.timeformat;
            this.start = prop.start;
            this.end = prop.end;
        }

        /**
         * Get the snapshots of the dynamic graph
         * Snapshots represent the graphs state and topology for every instance
         */
        snapshots() {
            // this only works temporarly with double and not dates
            // TODO make this work for dates at some point
            if (this.mode !== 'dynamic' || this.timeformat !== 'double') {
                console.log('Could not convert to snapshosts - not a dynamic network or timeformat is not double');
                return;
            }
            // for the timeformat double
            if (this.timeformat === 'double') {
                let snapshots = {};
                // first of all get all time instances
                // recursively find all keys with the object start or end in the graph element
                let startSet = new Set(_findValuesHelper(this, 'start', []).map(Number));
                let endSet = new Set(_findValuesHelper(this, 'end', []).map(Number));
                // combine the start and end sets
                // convert and sort it into an array
                let timeInstances = Array.from(new Set([...startSet, ...endSet])).sort((a, b) => a - b);
                // convert to object and append to the snapshots
                timeInstances.forEach(function(t) {
                    snapshots[t] = {
                        'nodes': [],
                        'edges': []
                    };
                });
                // iteate over nodes and parse them into the snapshots
                this.nodes.forEach(function(node) {
                    // parse spells
                    if ('spells' in node) {
                        // iterate of the spells and add them to the snpshots
                        node.spells.forEach(function(spell) {
                            let spellInstances = _getTimeInstances(timeInstances, parseFloat(spell.start), parseFloat(spell.end));
                            // append the nodes to the specific snapshots
                            spellInstances.forEach(function(t) {
                                snapshots[t].nodes.push(node);
                            });
                        });
                    }
                    // parse start and end
                    else if ('start' in node || 'end' in node) {
                        // all instances where the node exists
                        // array of all instances
                        let nodeInstances = _getTimeInstances(timeInstances, parseFloat(node.start), parseFloat(node.end));
                        // append the nodes to the specific snapshots
                        nodeInstances.forEach(function(t) {
                            snapshots[t].nodes.push(node);
                        });
                    }
                });

                // iteate over the edges and parse them into the
                this.edges.forEach(function(edge) {
                    // parse spells
                    if ('spells' in edge) {
                        // iterate of the spells and add them to the snpshots
                        edge.spells.forEach(function(spell) {
                            let spellInstances = _getTimeInstances(timeInstances, parseFloat(spell.start), parseFloat(spell.end));
                            // append the edges to the specific snapshots
                            spellInstances.forEach(function(t) {
                                snapshots[t].edges.push(edge);
                            });
                        });
                    }
                    // parse start and end
                    else if ('start' in edge || 'end' in edge) {
                        // all instances where the edge exists
                        // array of all instances
                        let edgeInstances = _getTimeInstances(timeInstances, parseFloat(edge.start), parseFloat(edge.end));
                        // append the edges to the specific snapshots
                        edgeInstances.forEach(function(t) {
                            snapshots[t].edges.push(edge);
                        });
                    }
                });

                // set time instances
                this.timeInstances = timeInstances;
                // set snapshots
                this.snapshots = snapshots;
                return snapshots;
            }
        }
    }

    /**
     * Node class.
     * An class which contains a node with optional elements
     */
    class Node {

        /**
         * Node constructor
         * @param  {string} id     id of the node
         * @param  {string} label  label of the node
         */
        constructor(id, label) {
            this.id = id;
            this.label = label;
        }

        /**
         * Set the viz properties of the node
         * @param  {String} rgba        color of the specific node
         */
        setVizRGBA(rgba) {
            this.rgba = rgba;
        }

        /**
         * Set the viz properties of the node
         * @param  {object} position    e.g. {'x':1,'y':1,'z':1,}
         */
        setVizPosition(position) {
            this.position = position;
        }

        /**
         * Set the viz properties of the node
         * @param  {double} size        node size scale
         */
        setVizSize(size) {
            this.size = size;
        }

        /**
         * Set the viz properties of the node
         * @param  {string} shape    node shape = {'disc','square','triangle',..,image}
         */
        setVizShape(shape) {
            this.shape = shape;
        }

        /**
         * Set the attributes values of the node
         * @param  {object} attrs    array of objects
         */
        setAttValues(attrs) {
            this.attributeValues = attrs;
        }

        /**
         * Set the dynamic node properties - start and end date
         * @param  {String} start    Start timestamp
         * @param  {String} end    End timestamp
         */
        setDynamicDates(start, end) {
            this.start = start;
            this.end = end;
        }

        /**
         * Set the dynamic node properties - start and end date
         * @param  {Object} spells    Array of spells objects with start and end
         */
        setSpells(spells) {
            this.spells = spells;
        }
    }

    /*
     * Edge class.
     * An class which contains a edge with optional elements
     */
    class Edge {

        /**
         * Edge constructor
         * @param  {string} id      id of the edge
         * @param  {string} source  id of the source node
         * @param  {string} target  id of the source target
         */
        constructor(id, source, target) {
            this.id = id;
            this.source = source;
            this.target = target;
        }

        /**
         * Set the edge type
         * @param  {String} type    type of the edge {'directed', 'unidirected', 'mutal'}
         */
        setType(type) {
            this.type = type;
        }

        /**
         * Set the edge label
         * @param  {String} label    label of the edge
         */
        setLabel(label) {
            this.label = label;
        }

        /**
         * Set the edge weight
         * @param  {double} weight    weight of the edge
         */
        setWeight(weight) {
            this.weight = weight;
        }

        /**
         * Set the attributes values of the edge
         * @param  {object} attrs    array of objects
         */
        setAttValues(attrs) {
            this.attributeValues = attrs;
        }

        /**
         * Set the viz properties of the edge
         * @param  {String} rgba        color of the specific edge
         */
        setVizRGBA(rgba) {
            this.rgba = rgba;
        }

        /**
         * Set the viz properties of the edge
         * @param  {object} thickness
         */
        setVizThickness(thickness) {
            this.thickness = thickness;
        }

        /**
         * Set the viz properties of the edge
         * @param  {string} shape    edge shape = {'solid','dotted',...}
         */
        setVizShape(shape) {
            this.shape = shape;
        }

        /**
         * Set the dynamic edge properties - start and end date
         * @param  {String} start    Start timestamp
         * @param  {String} end    End timestamp
         */
        setDynamicDates(start, end) {
            this.start = start;
            this.end = end;
        }

        /**
         * Set the dynamic edge properties - start and end date
         * @param  {Object} spells    Array of spells objects with start and end
         */
        setSpells(spells) {
            this.spells = spells;
        }
    }

    /*
     * Attribute class.
     * An class which contains an attribute with optional elements
     */
    class Attribute {
        //TODO default and options for attributes are not implemented
        /**
         * Attribute constructor
         * @param  {string} class   either node or edge
         * @param  {string} mode   either static or dynamic
         * @param  {string} id     id of the attribute
         * @param  {string} title  name of the attribute
         * @param  {string} type  type of the attribute
         */
        constructor(_class, mode, id, title, type) {
            this.class = _class;
            this.mode = mode;
            this.id = id;
            this.title = title;
            this.type = type;
        }

    }

    /**
     * Parse the XML file
     * @param {string} path path to the xml file
     */
    function parse(path) {
        // fetch the data with a promise
        return fetch(path)
            .then(response => response.text())
            .then(xmlString => (new window.DOMParser()).parseFromString(xmlString, 'text/xml'))
            .then(function(xml) {
                // log the version of the gexf file
                console.log('gefx version: ', xml.getElementsByTagName('gexf')[0].getAttribute('version'));
                // query meta data
                let meta = parseMetaData(xml.querySelector('meta'));

                // query  the graph properties
                let graphContent = parseGraphContent(xml.getElementsByTagName('graph')[0]);
                let graph = new Graph(graphContent, meta);

                // dynamic network
                if (graph.mode === 'dynamic') {
                    graph.setDynamicMetaData(parseDynamicMetaData(xml.getElementsByTagName('graph')[0]));
                }

                // query attributes - (optional)
                let attributes = {};
                if (xml.querySelectorAll('attributes').length)
                    attributes = parseAttributes(xml.querySelectorAll('attributes'));

                // query parse nodes
                let nodes = parseNodes(xml.querySelectorAll('node'), graph.mode);

                // query parse edges
                let edges = parseEdges(xml.querySelectorAll('edge'), graph.mode);

                // graph set properties
                graph.setAttributes(attributes);
                graph.setNodes(nodes);
                graph.setEdges(edges);

                return graph;
            });
    }

    /**
     * Parse the XML metadata
     * @param {nodelist} data  meta node
     */
    function parseMetaData(data) {
        let meta = {};
        // if empty return null
        if (!data)
            return meta;
        // parse meta data
        meta.lastmodifieddate = data.hasAttribute('lastmodifieddate') ? data.getAttribute('lastmodifieddate') : '';
        meta.creator = data.querySelector('creator') ? data.querySelector('creator').innerHTML : '';
        meta.keywords = data.querySelector('keywords') ? data.querySelector('keywords').innerHTML : '';
        meta.description = data.querySelector('description') ? data.querySelector('description').innerHTML : '';

        return meta;
    }

    /**
     * Parse graph content
     * @param {object} data   graph xml
     */
    function parseGraphContent(data) {
        let graphContent = {};
        // mode e.g. dynamic static
        graphContent.mode = data.hasAttribute('mode') ? data.getAttribute('mode') : 'static';
        // edge type e.g. directed, unidirected
        graphContent.defaultedgetype = data.hasAttribute('defaultedgetype') ? data.getAttribute('defaultedgetype') : 'undirected';
        // id type either string or integer
        graphContent.idtype = data.hasAttribute('idtype') ? data.getAttribute('idtype') : 'string';

        return graphContent;
    }

    /**
     * Parse the Dynamic XML metadata
     * @param {nodelist} data  meta node
     */
    function parseDynamicMetaData(data) {
        let dynamicContent = {};
        // time format
        dynamicContent.timeformat = data.hasAttribute('timeformat') ? data.getAttribute('timeformat') : 'double';
        // dynamic graph start date
        dynamicContent.start = data.hasAttribute('start') ? data.getAttribute('start') : (data.hasAttribute('startopen') ? data.getAttribute('startopen') : '');
        // dynamic graph end date
        dynamicContent.end = data.hasAttribute('end') ? data.getAttribute('end') : (data.hasAttribute('endopen') ? data.getAttribute('endopen') : '');

        return dynamicContent;
    }

    /**
     * Parse attributes content
     * @param {object} list   attribtutes node list
     */
    function parseAttributes(list) {
        // iterate over edge attributes and node attributes
        // flaten the 2 arrays into 1d array
        return [].concat.apply([], Array.prototype.map.call(list, function(attrs) {
            let _class = attrs.hasAttribute('class') ? attrs.getAttribute('class') : '';
            let mode = attrs.hasAttribute('mode') ? attrs.getAttribute('mode') : 'static';
            // iterate over the individual attributes in the class attributes
            // e.g. node attributes and edge attributes
            return Array.prototype.map.call(attrs.querySelectorAll('attribute'), function(attr) {
                let id = attr.hasAttribute('id') ? attr.getAttribute('id') : '';
                let title = attr.hasAttribute('title') ? attr.getAttribute('title') : '';
                let type = attr.hasAttribute('type') ? attr.getAttribute('type') : 'string';
                return new Attribute(_class, mode, id, title, type);
            });
        }));
    }

    /**
     * Parse the nodes
     * @param {nodelist} list  nodes node-object
     * @param {String} mode  either static or dynamic
     */
    function parseNodes(list, mode) {
        let nodes = {};
        // if empty return null
        if (!list)
            return {};

        // iterate the node list
        nodes = Array.prototype.map.call(list, function(_node) {
            let id = _node.hasAttribute('id') ? _node.getAttribute('id') : 'missing-id';
            let label = _node.hasAttribute('label') ? _node.getAttribute('label') : 'missing-label';
            let node = new Node(id, label);

            // parse attributes
            if (_node.querySelector('attvalues')) {
                node.setAttValues(Array.prototype.map.call(_node.querySelectorAll('attvalue'), function(attr) {
                    let _for = attr.hasAttribute('for') ? attr.getAttribute('for') : (attr.hasAttribute('id') ? attr.getAttribute('id') : '');
                    let value = attr.hasAttribute('value') ? attr.getAttribute('value') : '';

                    // if dynamic parse the start and end
                    if (mode === 'dynamic') {
                        let start = attr.hasAttribute('start') ? attr.getAttribute('start') : (attr.hasAttribute('startopen') ? attr.getAttribute('startopen') : (attr.hasAttribute('timestamp') ? attr.getAttribute('timestamp') : ''));

                        // dynamic graph end date
                        let end = attr.hasAttribute('end') ? attr.getAttribute('end') : (attr.hasAttribute('endopen') ? attr.getAttribute('endopen') : (attr.hasAttribute('timestamp') ? attr.getAttribute('timestamp') : ''));
                        return {
                            'for': _for,
                            'value': value,
                            'start': start,
                            'end': end
                        };
                    }

                    return {
                        'for': _for,
                        'value': value
                    };
                }));
            }

            // parse viz attributes
            // color attribute
            if (_node.getElementsByTagName('viz:color').length) {
                let color = _node.getElementsByTagName('viz:color')[0];
                let r = color.hasAttribute('r') ? color.getAttribute('r') : '255';
                let g = color.hasAttribute('g') ? color.getAttribute('g') : '255';
                let b = color.hasAttribute('b') ? color.getAttribute('b') : '255';
                let a = color.hasAttribute('a') ? color.getAttribute('a') : '1';
                node.setVizRGBA('rgba(' + r + ',' + g + ',' + b + ',' + a + ')');
            }
            // viz position
            if (_node.getElementsByTagName('viz:position').length) {
                let position = _node.getElementsByTagName('viz:position')[0];
                let x = position.hasAttribute('x') ? position.getAttribute('x') : '0';
                let y = position.hasAttribute('y') ? position.getAttribute('y') : '0';
                let z = position.hasAttribute('z') ? position.getAttribute('z') : '0';
                node.setVizPosition({
                    'x': parseFloat(x),
                    'y': parseFloat(y),
                    'z': parseFloat(z)
                });
            }
            // viz size
            if (_node.getElementsByTagName('viz:size').length) {
                let size = _node.getElementsByTagName('viz:size')[0];
                let value = size.hasAttribute('value') ? size.getAttribute('value') : '1.0';
                node.setVizSize(parseFloat(value));
            }
            // viz shape
            if (_node.getElementsByTagName('viz:shape').length) {
                let shape = _node.getElementsByTagName('viz:shape')[0];
                let value = shape.hasAttribute('value') ? shape.getAttribute('value') : 'disc';
                node.setVizShape(value);
            }

            // dynamic graph data
            if (mode === 'dynamic') {
                // if has element spells ignore the start and end attribute
                if (_node.querySelector('spells')) {
                    // parse the spells
                    node.setSpells(Array.prototype.map.call(_node.querySelectorAll('spell'), function(spell) {
                        let start = spell.hasAttribute('start') ? spell.getAttribute('start') : (spell.hasAttribute('startopen') ? spell.getAttribute('startopen') : (spell.hasAttribute('timestamp') ? spell.getAttribute('timestamp') : ''));

                        // dynamic graph end date
                        let end = spell.hasAttribute('end') ? spell.getAttribute('end') : (spell.hasAttribute('endopen') ? spell.getAttribute('endopen') : (spell.hasAttribute('timestamp') ? spell.getAttribute('timestamp') : ''));

                        // return the spell as an object
                        return {
                            'start': start,
                            'end': end
                        };
                    }));
                } else {
                    // dynamic graph start date
                    let start = _node.hasAttribute('start') ? _node.getAttribute('start') : (_node.hasAttribute('startopen') ? _node.getAttribute('startopen') : (_node.hasAttribute('timestamp') ? _node.getAttribute('timestamp') : ''));

                    // dynamic graph end date
                    let end = _node.hasAttribute('end') ? _node.getAttribute('end') : (_node.hasAttribute('endopen') ? _node.getAttribute('endopen') : (_node.hasAttribute('timestamp') ? _node.getAttribute('timestamp') : ''));

                    node.setDynamicDates(start, end);
                }
            }

            return node;
        });
        return nodes;
    }

    /**
     * Parse the edges
     * @param {nodelist} list  edges node-object
     * @param {String} mode  either static or dynamic
     */
    function parseEdges(list, mode) {
        let edges = {};
        // if empty return null
        if (!list)
            return {};

        // iterate the node list
        edges = Array.prototype.map.call(list, function(_edge) {
            // get required edge attributes
            let id = _edge.hasAttribute('id') ? _edge.getAttribute('id') : 'missing-id';
            let source = _edge.hasAttribute('source') ? _edge.getAttribute('source') : 'missing-source';
            let target = _edge.hasAttribute('target') ? _edge.getAttribute('target') : 'missing-target';
            let edge = new Edge(id, source, target);

            // get optional edge attributes
            let type = _edge.hasAttribute('type') ? _edge.getAttribute('type') : '';
            if (type)
                edge.setType(type);

            let label = _edge.hasAttribute('label') ? _edge.getAttribute('label') : '';
            if (label)
                edge.setLabel(label);

            let weight = _edge.hasAttribute('weight') ? parseFloat(_edge.getAttribute('weight')) : '';
            if (weight)
                edge.setLabel(weight);

            // parse attributes
            if (_edge.querySelector('attvalues')) {
                edge.setAttValues(Array.prototype.map.call(_edge.querySelectorAll('attvalue'), function(attr) {
                    let _for = attr.hasAttribute('for') ? attr.getAttribute('for') : (attr.hasAttribute('id') ? attr.getAttribute('id') : '');
                    let value = attr.hasAttribute('value') ? attr.getAttribute('value') : '';

                    // if dynamic parse the start and end
                    if (mode === 'dynamic') {
                        let start = attr.hasAttribute('start') ? attr.getAttribute('start') : (attr.hasAttribute('startopen') ? attr.getAttribute('startopen') : (attr.hasAttribute('timestamp') ? attr.getAttribute('timestamp') : ''));

                        // dynamic graph end date
                        let end = attr.hasAttribute('end') ? attr.getAttribute('end') : (attr.hasAttribute('endopen') ? attr.getAttribute('endopen') : (attr.hasAttribute('timestamp') ? attr.getAttribute('timestamp') : ''));
                        return {
                            'for': _for,
                            'value': value,
                            'start': start,
                            'end': end
                        };
                    }

                    return {
                        'for': _for,
                        'value': value
                    };
                }));
            }

            // parse viz attributes
            // color attribute
            if (_edge.getElementsByTagName('viz:color').length) {
                let color = _edge.getElementsByTagName('viz:color')[0];
                let r = color.hasAttribute('r') ? color.getAttribute('r') : '255';
                let g = color.hasAttribute('g') ? color.getAttribute('g') : '255';
                let b = color.hasAttribute('b') ? color.getAttribute('b') : '255';
                let a = color.hasAttribute('a') ? color.getAttribute('a') : '1';
                edge.setVizRGBA('rgba(' + r + ',' + g + ',' + b + ',' + a + ')');
            }
            // viz size
            if (_edge.getElementsByTagName('viz:size').length) {
                let size = _edge.getElementsByTagName('viz:size')[0];
                let value = size.hasAttribute('value') ? size.getAttribute('value') : '1.0';
                edge.setVizThickness(parseFloat(value));
            }
            // viz shape
            if (_edge.getElementsByTagName('viz:shape').length) {
                let shape = _edge.getElementsByTagName('viz:shape')[0];
                let value = shape.hasAttribute('value') ? shape.getAttribute('value') : 'solid';
                edge.setVizShape(value);
            }

            // dynamic graph data
            if (mode === 'dynamic') {
                // if has element spells ignore the start and end attribute
                if (_edge.querySelector('spells')) {
                    // parse the spells
                    edge.setSpells(Array.prototype.map.call(_edge.querySelectorAll('spell'), function(spell) {
                        let start = spell.hasAttribute('start') ? spell.getAttribute('start') : (spell.hasAttribute('startopen') ? spell.getAttribute('startopen') : (spell.hasAttribute('timestamp') ? spell.getAttribute('timestamp') : ''));

                        // dynamic graph end date
                        let end = spell.hasAttribute('end') ? spell.getAttribute('end') : (spell.hasAttribute('endopen') ? spell.getAttribute('endopen') : (spell.hasAttribute('timestamp') ? spell.getAttribute('timestamp') : ''));

                        // return the spell as an object
                        return {
                            'start': start,
                            'end': end
                        };
                    }));
                } else {
                    // dynamic graph start date
                    let start = _edge.hasAttribute('start') ? _edge.getAttribute('start') : (_edge.hasAttribute('startopen') ? _edge.getAttribute('startopen') : (_edge.hasAttribute('timestamp') ? _edge.getAttribute('timestamp') : ''));

                    // dynamic graph end date
                    let end = _edge.hasAttribute('end') ? _edge.getAttribute('end') : (_edge.hasAttribute('endopen') ? _edge.getAttribute('endopen') : (_edge.hasAttribute('timestamp') ? _edge.getAttribute('timestamp') : ''));

                    edge.setDynamicDates(start, end);
                }
            }

            return edge;
        });
        return edges;
    }

    /**
     * Find recursively all values in a object using a key
     * Source: https://gist.github.com/shakhal/3cf5402fc61484d58c8d
     * @param {object} obj  Object to be searched
     * @param {String} key  key to look for
     * @param {Array} list  array of all values
     */
    function _findValuesHelper(obj, key, list) {
        if (!obj) return list;
        if (obj instanceof Array) {
            for (var i in obj) {
                list = list.concat(_findValuesHelper(obj[i], key, []));
            }
            return list;
        }
        if (obj[key]) list.push(obj[key]);

        if ((typeof obj == 'object') && (obj !== null)) {
            var children = Object.keys(obj);
            if (children.length > 0) {
                for (i = 0; i < children.length; i++) {
                    list = list.concat(_findValuesHelper(obj[children[i]], key, []));
                }
            }
        }
        return list;
    }
    /**
     * Get all time instances between start and end
     * @param {Array} timeInstances  Array of all time instance
     * @param {start} float  start instance of the element
     * @param {end} float  end instance of the element
     */
    function _getTimeInstances(timeInstances, start, end) {
        // if start is undefined we take the first insatnce
        if (!start && typeof timeInstances[0] !== 'undefined') {
            start = timeInstances;
        }
        // if end is not defined we take the last instance
        if (!end && typeof timeInstances[timeInstances.length - 1] !== 'undefined') {
            end = timeInstances[timeInstances.length - 1];
        }
        // get the indexes of the start and end time instances of the array
        let firsIndex = timeInstances.indexOf(start);
        let secondIndex = timeInstances.indexOf(end);

        // get all values between start and end
        return timeInstances.slice(firsIndex, (secondIndex + 1));
    }

    // AMD registration
    if (typeof define === 'function' && define.amd) {
        define('gexf', [], function() {
            return gexf;
        });
    }
}.call(this));