---
title: Prueba de Usabilidad — Curva Individual
---

# Prueba de Usabilidad

```js
import {Runtime, Inspector} from "npm:@observablehq/runtime@5";
import define from "https://api.observablehq.com/@john-guerra/explorador-canguro@972.js?v=4";
```

<div class="container">
  <div class="row">
    <div id="divChart" class="col-12">
      <div id="observablehq-viewof-SelectedTimeId"></div>
      <div id="observablehq-comparisonChart"></div>
    </div>
  </div>
</div>

```js
const notebook = new Runtime().module(define, (name) => {
  const targets = {
    "viewof SelectedTimeId": "#observablehq-viewof-SelectedTimeId",
    "comparisonChart": "#observablehq-comparisonChart",
  };
  if (targets[name]) return new Inspector(document.querySelector(targets[name]));
  return ["G1G2", "selectedStages", "SelectedTime", "dataF"].includes(name);
});

notebook.redefine("width", document.getElementById("divChart").offsetWidth);
```
