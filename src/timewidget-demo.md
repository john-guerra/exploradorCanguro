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

<style>
/* TimeWidget draws the authoritative (zoom-aware) tick axes; the zoomable axes
   sit beside them in the enlarged margins as scented range sliders — hide their
   own ticks/domain, keep scent + handles. */
.zoomable-axis-input .za-axis .tick,
.zoomable-axis-input .za-axis .domain { display: none; }
.zoomable-axis-input { z-index: 5; }
</style>

```js
import {timeWidgetReactive} from "./components/timeWidget.js";
import { zoomableAxisInput } from "@john-guerra/d3-zoomable-axis/input";
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
// Chart + plot geometry. TimeWidget's own tick axes stay; the zoom controls sit
// in the ENLARGED margins beside them (weight in the wide left margin, weeks in
// the tall bottom margin), above TimeWidget's own below-chart panels.
const margin = { left: 118, top: 30, right: 50, bottom: 104 };
const chartW = Math.min(width - 40, 900);
const chartH = 520;
const plotW = chartW - margin.left - margin.right;
const plotH = chartH - margin.top - margin.bottom;
// zoomable-axis geometry (its defaults): domain line sits axLine px into the widget.
const axMargin = 22, axThick = 44, axLine = axMargin + axThick / 2; // 44
```

```js
const tw = timeWidgetReactive(data, {
  x: "__time",
  y: "peso",
  id: "Code",
  groupAttr: "ERN_Sexo",
  renderer: "canvas",
  width: chartW,
  height: chartH,
  margin,
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
const weeksSlider = zoomableAxisInput(weekExtent, {
  orient: "bottom", step: 1, length: plotW, value: weekExtent,
  label: "Edad gestacional", units: "sem",
  scent: { values: data.map((d) => d.__time), type: "histogram", bins: 40 },
});
const weightSlider = zoomableAxisInput(weightExtent, {
  orient: "left", step: 100, length: plotH, value: weightExtent,
  label: "Peso", units: "g",
  scent: { values: data.map((d) => d.peso), type: "violin", bins: 40 },
});
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
// TimeWidget keeps its own tick axes; each scented zoom control sits beside them
// in the enlarged margins, its scale aligned to the plot's pixel range so the
// handles track the axis at full extent (above TimeWidget's below-chart panels).
display(html`
  <div style="position:relative; width:${chartW}px;">
    ${tw}
    <div style="position:absolute; left:2px; top:${margin.top - axMargin}px;">${weightSlider}</div>
    <div style="position:absolute; left:${margin.left - axMargin}px; top:${chartH - 48 - axLine}px;">${weeksSlider}</div>
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
