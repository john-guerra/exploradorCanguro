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
const selected = view(tw);
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
