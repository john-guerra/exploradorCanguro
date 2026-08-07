---
title: Explorador Canguro
---

# Explorador Canguro

Explorador nativo (Observable Framework) de trayectorias de peso de bebés prematuros
del Programa Canguro. Usa la librería **TimeWidget** local con zoom por semanas y peso.

> Nota: abajo se comparan los grupos por **sexo** (los datos publicados son anónimos). La
> definición de grupos arbitrarios (G1/G2 estilo RCIU vía FacetedSearch) requiere incluir más
> atributos en el conjunto anonimizado — pendiente de revisión de privacidad.

<style>
/* TimeWidget draws the authoritative (zoom-aware) tick axes. The zoomable axes
   sit just OUTSIDE them as scented range sliders — full-extent zoom controls, not
   the data axis — so hide their own ticks/domain and keep only scent + handles. */
.zoomable-axis-input .za-axis .tick,
.zoomable-axis-input .za-axis .domain { display: none; }
.zoomable-axis-input { z-index: 5; }
</style>

```js
import { timeWidgetReactive } from "./components/timeWidget.js";
import { zoomableAxisInput } from "@john-guerra/d3-zoomable-axis/input";
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
// Chart + plot geometry. TimeWidget's own (zoom-aware) tick axes stay; the zoom
// controls sit in the ENLARGED margins beside them — the vertical weight control
// in the wide left margin, the horizontal weeks control in the tall bottom
// margin — above TimeWidget's own below-chart panels (Coordinates/Groups).
const margin = { left: 118, top: 30, right: 50, bottom: 104 };
const chartW = Math.min(width - 40, 900);
const chartH = 520;
const plotW = chartW - margin.left - margin.right;
const plotH = chartH - margin.top - margin.bottom;
// zoomable-axis geometry (its defaults): the scale starts axMargin px into the
// widget; the (hidden) domain line sits axLine px in. Used to align each control's
// scale with the plot's pixel range so the handles track the axis at full extent.
const axMargin = 22, axThick = 44, axLine = axMargin + axThick / 2; // 44
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
// Accessible scented zoom controls (native <input type=range>, keyboard + screen
// reader). Ticks hidden via CSS — TimeWidget owns the tick axis; these are the
// full-extent range sliders that sit beside it, showing the data distribution.
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
// TimeWidget is offset right by yBand; each zoom control sits OUTSIDE its axis:
//  • weight (vertical) in the left band, its scale aligned to the plot's y-range;
//  • weeks (horizontal) in the bottom band (below TimeWidget's x ticks+label),
//    its scale aligned to the plot's x-range.
// So the handles track the axis at full extent, but the control is clearly a
// separate scented range slider — TimeWidget's own ticks remain the data axis.
display(html`
  <div style="position:relative; width:${chartW}px;">
    ${tw}
    <div style="position:absolute; left:2px; top:${margin.top - axMargin}px;">${weightSlider}</div>
    <div style="position:absolute; left:${margin.left - axMargin}px; top:${chartH - 48 - axLine}px;">${weeksSlider}</div>
  </div>
`);
```

## Comparación de grupos (por sexo)

Selecciona una ventana de tiempo con un brush en la gráfica; las tarjetas y la distribución de
abajo se actualizan con los puntos seleccionados (acoplamiento directo).

```js
const selected = Generators.input(tw);
```

```js
const metric = view(Inputs.select(
  new Map([["Peso (g)", "peso"], ["Talla (mm)", "talla"], ["Perímetro cefálico (mm)", "PC"]]),
  { label: "Métrica", value: "peso" }
));
```

```js
// Points inside the current brush selection; fall back to all data before any brush.
const selectedPoints = (() => {
  const pts = (Array.isArray(selected) ? selected : []).flatMap((g) => g?.data || []);
  return pts.length ? pts : data;
})();
const sexLabel = (s) => (s === 1 ? "Masculino" : s === 2 ? "Femenino" : "Otro");
```

```js
// summary stats per sex for the chosen metric over the selection
const statsBySex = d3
  .rollups(
    selectedPoints.filter((d) => d[metric] != null),
    (v) => ({ n: v.length, mean: d3.mean(v, (d) => d[metric]), median: d3.median(v, (d) => d[metric]), sd: d3.deviation(v, (d) => d[metric]) }),
    (d) => d.sex
  )
  .sort((a, b) => d3.ascending(a[0], b[0]));
```

<div class="grid grid-cols-2">
  <div class="card">
    <h3>Tarjeta de estadísticas — ${metric}</h3>
    ${Inputs.table(
      statsBySex.map(([sex, s]) => ({
        Grupo: sexLabel(sex), n: s.n,
        Media: s.mean != null ? s.mean.toFixed(1) : "—",
        Mediana: s.median != null ? s.median.toFixed(1) : "—",
        "Desv.": s.sd != null ? s.sd.toFixed(1) : "—",
      })),
      { header: { Grupo: "Grupo", n: "n", Media: "Media", Mediana: "Mediana", "Desv.": "Desv. est." } }
    )}
  </div>
  <div class="card">
    <h3>Distribución — ${metric}</h3>
    ${Plot.plot({
      height: 280,
      marginLeft: 60,
      x: { label: "Sexo" },
      y: { label: metric, grid: true },
      color: { legend: false },
      marks: [
        Plot.boxY(selectedPoints.filter((d) => d[metric] != null), {
          x: (d) => sexLabel(d.sex), y: metric, fill: (d) => sexLabel(d.sex), fillOpacity: 0.3,
        }),
      ],
    })}
  </div>
</div>

## Contributors

These research tools are the result of a collaboration between Universidad Rey Juan Carlos
in Madrid (Iván Velasco, Sofía Bayona and Luis Pastor), The Kangaroo Foundation in Colombia
(Nathalie Charpak, José Tiberio Hernández), and Northeastern University in Silicon Valley
(John Alexis Guerra Gómez).
