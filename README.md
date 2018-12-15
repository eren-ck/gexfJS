# gexfJS - A gexf parser

>  **Parse static and dynamic graphs in gexf format**

## Usage


**Parsing**
```js
let promise = gexf.parse('minimal.gexf');
promise.then(function(graph) {
    console.log(graph);
});
```

> Result
```json
{
  "mode": "static",
  "defaultedgetype": "directed",
  "idtype": "string",
  "meta": {
    "lastmodifieddate": "2009-03-20",
    "creator": "Gexf.net",
    "keywords": "",
    "description": "A hello world! file"
  },
  "attributes": {},
  "nodes": [
    {
      "id": "0",
      "label": "Hello"
    },
    {
      "id": "1",
      "label": "Word"
    }
  ],
  "edges": [
    {
      "id": "0",
      "source": "0",
      "target": "1"
    }
  ]
}
```

**Parsing dynamic graphs to array of static graphs**
```js
let promise = gexf.parse('photoviz_dynamic.gexf');
promise.then(function(graph) {
    console.log(graph);
    // Dynamic graphs can be transformed into snapshots
    // Array of static graphs
    console.log(graph.snapshots());
});
```

***
**Todo** - add the following gexf features:

* Hierarchy - https://gephi.org/gexf/format/hierarchy.html
* Phylogeny - https://gephi.org/gexf/format/phylogeny.html
* Dynamic - parse js date


## Contributors

* Eren Cakmak - initial work

## License

This project is licensed under the MIT License - see the LICENSE.md file for details
