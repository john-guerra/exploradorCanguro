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
// Chart + plot geometry, shared by the chart and the axis-aligned sliders.
const margin = { left: 50, top: 30, right: 50, bottom: 50 };
const chartW = Math.min(width - 80, 900);
const chartH = 500;
const plotW = chartW - margin.left - margin.right;
const plotH = chartH - margin.top - margin.bottom;
const sliderThickness = 34;
```

```js
const tw = timeWidgetReactive(data, {
  x: "__time",
  y: "peso",
  id: "id",
  groupAttr: "sex",
  renderer: "canvas",
  width: chartW,
  height: chartH,
  margin,
  xLabel: "Edad gestacional (semanas)",
  yLabel: "Peso (g)",
  showGroupMedian: true,
});
tw.ts.addReferenceCurves(curvas);
```

```js
// Sliders sized to the chart's plot area so they sit directly on the axes.
const weeksSlider  = rangeSlider({ domain: weekExtent,   value: weekExtent,   orientation: "horizontal", step: 1,   length: plotW, thickness: sliderThickness, label: "" });
const weightSlider = rangeSlider({ domain: weightExtent, value: weightExtent, orientation: "vertical",   step: 100, length: plotH, thickness: sliderThickness, label: "" });
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
// Place the sliders directly on the axes: the vertical weight slider spans the
// plot's y-range just left of the y-axis; the horizontal weeks slider spans the
// plot's x-range just under the x-axis.
display(html`
  <div style="position:relative; width:${sliderThickness + chartW}px; height:${chartH + sliderThickness + 4}px;">
    <div style="position:absolute; left:0; top:${margin.top}px;">${weightSlider}</div>
    <div style="position:absolute; left:${sliderThickness}px; top:0;">${tw}</div>
    <div style="position:absolute; left:${sliderThickness + margin.left}px; top:${chartH}px;">${weeksSlider}</div>
  </div>
`);
```

## Contributors

These research tools are the result of a collaboration between Universidad Rey Juan Carlos
in Madrid (Iván Velasco, Sofía Bayona and Luis Pastor), The Kangaroo Foundation in Colombia
(Nathalie Charpak, José Tiberio Hernández), and Northeastern University in Silicon Valley
(John Alexis Guerra Gómez).
