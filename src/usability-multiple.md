---
title: KMC Explorer — Múltiples Curvas
---

# KMC Explorer

```js
import {Runtime, Inspector} from "npm:@observablehq/runtime@5";
import define from "https://api.observablehq.com/@john-guerra/explorador-canguro@972.js?v=4";
```

<div class="container">
  <div class="row">
    <div class="col-4">
      <div id="observablehq-Coordinates"></div>
      <div id="observablehq-viewof-attribs"></div>
      <div id="observablehq-viewof-nameG1"></div>
      <div id="observablehq-viewof-G1"></div>
      <div id="observablehq-viewof-nameG2"></div>
      <div id="observablehq-viewof-G2"></div>
    </div>
    <div id="divChart" class="col-8">
      <div id="observablehq-viewof-SelectedTimeId"></div>
      <div id="observablehq-statsCardChart"></div>
      <div id="observablehq-comparisonChart"></div>
      <div id="observablehq-violinsChart"></div>
      <div id="observablehq-viewof-attribsImpact"></div>
    </div>
  </div>
</div>

```js
const notebook = new Runtime().module(define, (name) => {
  const targets = {
    "viewof attribs": "#observablehq-viewof-attribs",
    "viewof nameG1": "#observablehq-viewof-nameG1",
    "viewof G1": "#observablehq-viewof-G1",
    "viewof nameG2": "#observablehq-viewof-nameG2",
    "viewof G2": "#observablehq-viewof-G2",
    "viewof SelectedTimeId": "#observablehq-viewof-SelectedTimeId",
    "statsCardChart": "#observablehq-statsCardChart",
    "comparisonChart": "#observablehq-comparisonChart",
    "violinsChart": "#observablehq-violinsChart",
    "viewof attribsImpact": "#observablehq-viewof-attribsImpact",
    "brushCoordinatesElement": "#observablehq-Coordinates",
  };
  if (targets[name]) return new Inspector(document.querySelector(targets[name]));
  return ["G1G2", "selectedStages", "SelectedTime", "configImpact", "updateG1", "updateG2", "dataF"].includes(name);
});

notebook.redefine("width", document.getElementById("divChart").offsetWidth);
```
