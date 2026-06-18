---
title: TimeWidget (nativo)
---

# TimeWidget — integración nativa

This page is the **target architecture** for the migration: it uses the local
[`time-widget`](https://github.com/john-guerra/TimeWidget) library directly
(via `file:../TimeWidget`), wrapped as a reactive widget with
[`reactive-widget-helper`](https://johnguerra.co/reactiveWidgets). No hosted
Observable notebook, no `localhost:8080` dependency.

Brush a time range on the chart below — the selection flows reactively into the
cells underneath.

```js
import {timeWidgetReactive} from "./components/timeWidget.js";
import { rangeSlider } from "./components/rangeSlider.js";
```

```js
// Public sample of aligned Kangaroo data shipped with TimeWidget.
// Columns: Code, __stageName, __stageId, __time, ERN_Sexo, peso, talla, PC
const raw = await FileAttachment("data/sample-canguro.csv").csv({typed: true});
const curvasPeso = await FileAttachment("data/curvasPeso.json").json();
```

```js
// Keep rows with a valid weight and gestational time.
const data = raw.filter((d) => d.peso != null && d.__time != null);
```

```js
const weekExtent   = d3.extent(data, (d) => d.__time);
const weightExtent = d3.extent(data, (d) => d.peso);
```

```js
const tw = timeWidgetReactive(data, {
  x: "__time",
  y: "peso",
  id: "Code",
  groupAttr: "ERN_Sexo",
  renderer: "canvas",
  width: Math.min(width - 40, 900),
  height: 500,
  xLabel: "Edad gestacional (semanas)",
  yLabel: "Peso (g)",
  fmtX: (d) => `${d} sem`,
  hasDetails: false,
  showGroupMedian: true,
});

// Overlay the Fenton/WHO weight reference curves.
tw.ts.addReferenceCurves(curvasPeso);
```

```js
const weeksSlider  = rangeSlider({ domain: weekExtent,   value: weekExtent,   orientation: "horizontal", step: 1,   length: 600, label: "Semanas" });
const weightSlider = rangeSlider({ domain: weightExtent, value: weightExtent, orientation: "vertical",   step: 100, length: 500, label: "Peso (g)" });
```

```js
const weeks  = Generators.input(weeksSlider);
```

```js
const weight = Generators.input(weightSlider);
```

```js
// Re-zoom whenever a slider changes; brush selections persist (ts.update reapplies them).
tw.ts.setDomains({ x: weeks, y: weight });
```

```js
const resetBtn = html`<button class="btn btn-sm btn-outline-secondary">Reset zoom</button>`;
resetBtn.onclick = () => {
  weeksSlider.setValue(tw.ts.fullExtent.x);
  weightSlider.setValue(tw.ts.fullExtent.y);
};

const dupBtn = html`<button class="btn btn-sm btn-outline-primary">Duplicar grupo</button>`;
dupBtn.onclick = () => tw.ts.duplicateSelectedGroup();

display(html`<div style="display:flex; gap:.5rem; margin:.5rem 0;">${resetBtn}${dupBtn}</div>`);
```

```js
display(html`
  <div style="display:grid; grid-template-columns:auto 1fr; grid-template-rows:auto auto; gap:.5rem; align-items:center;">
    <div style="grid-row:1; grid-column:1;">${weightSlider}</div>
    <div style="grid-row:1; grid-column:2;">${tw}</div>
    <div style="grid-row:2; grid-column:2;">${weeksSlider}</div>
  </div>
`);
```

```js
const selected = Generators.input(tw);
```

```js
// Reactive readout of the current brush selection.
const totalSelected = selected.reduce((acc, g) => acc + (g.data?.length ?? 0), 0);
```

<div class="card">
  <h2>Selección actual</h2>
  ${selected.length === 0
    ? html`<p>Dibuja un rango en la gráfica para seleccionar trayectorias.</p>`
    : html`<p><strong>${selected.length}</strong> grupo(s),
        <strong>${totalSelected}</strong> observaciones seleccionadas.</p>`}
</div>

```js
display(
  Inputs.table(
    selected.flatMap((g, i) =>
      (g.data ?? []).slice(0, 5).map((d) => ({grupo: i, ...d}))
    )
  )
);
```
