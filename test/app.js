/*eslint-disable no-unused-lets*/
/*global, gexf*/
'use strict';

/**
 * Testing the parser
 * @author eren-ck (Eren Cakmak)
 */

document.addEventListener('DOMContentLoaded', function() {
    // testing static gexf files
    let promise = gexf.parse('data/minimal.gexf');
    promise.then(function(graph) {
        console.log(graph);
        // console.log(graph.snapshots());
    });

});