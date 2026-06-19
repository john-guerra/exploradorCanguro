---
title: Explorador Canguro
---

# Explorador Canguro

Explorador nativo (Observable Framework) de trayectorias de peso de bebés prematuros
del Programa Canguro. Usa la librería **TimeWidget** local con zoom por semanas y peso.

> Nota: la definición de grupos (G1/G2) y los paneles estadísticos (tarjeta de estadísticas,
> comparación y violines) llegan en fases posteriores de la migración.

```js
import { timeWidgetReactive } from "./components/timeWidget.js";
import { rangeSlider } from "./components/rangeSlider.js";
```

```js
const data = await FileAttachment("data/canguro.csv").csv({ typed: true });
const curvas = await FileAttachment("data/curvas.json").json();
```

```js
const weekExtent   = d3.extent(data, (d) => d.__time);
const weightExtent = d3.extent(data, (d) => d.peso);
```

```js
const tw = timeWidgetReactive(data, {
  x: "__time",
  y: "peso",
  id: "id",
  groupAttr: "sex",
  renderer: "canvas",
  width: Math.min(width - 40, 900),
  height: 500,
  xLabel: "Edad gestacional (semanas)",
  yLabel: "Peso (g)",
  showGroupMedian: true,
});
tw.ts.addReferenceCurves(curvas);
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
// Re-zoom whenever a slider changes; brush selections persist.
tw.ts.setDomains({ x: weeks, y: weight });
```

```js
const resetBtn = html`<button class="btn btn-sm btn-outline-secondary">Reset zoom</button>`;
resetBtn.onclick = () => {
  weeksSlider.setValue(tw.ts.fullExtent.x);
  weightSlider.setValue(tw.ts.fullExtent.y);
};
display(html`<div style="margin:.5rem 0;">${resetBtn}</div>`);
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

## Contributors

These research tools are the result of a collaboration between Universidad Rey Juan Carlos
in Madrid (Iván Velasco, Sofía Bayona and Luis Pastor), The Kangaroo Foundation in Colombia
(Nathalie Charpak, José Tiberio Hernández), and Northeastern University in Silicon Valley
(John Alexis Guerra Gómez).
