# TimeWidget: range-slider zoom + duplicate group — Design

**Date:** 2026-06-18
**Status:** Approved (design); pending implementation plan
**Author:** John Alexis Guerra Gómez (with Claude)

## Context

The Explorador Canguro app visualizes premature-infant weight/length/cranial-perimeter
trajectories over gestational age using the [TimeWidget](https://github.com/ivelascog/TimeWidget)
library (vendored into the app as `src/lib/TimeWidget.esm.js`). Researchers need to **zoom in**
on a sub-range of weeks (x, gestational age) or weight (y) to inspect dense regions, and to
**duplicate the current brush group** so they can compare a variation of an existing selection
without rebuilding its brushes by hand.

Two capabilities are missing:

1. **Zoom by weeks or weight.** TimeWidget supports `xDomain`/`yDomain` at construction, but the
   x-domain cannot be changed after creation: `initDomains` (in `src/TimeWidget.js`) reads a
   private closure variable `xDomain` with `if (!xDomain)`, ignoring `ts.xDomain` on re-render,
   whereas the y-domain already reads the public `ts.yDomain`. There is no public re-render API
   that accepts new domains.
2. **Duplicate the current group.** TimeWidget has "Add Group" (`addBrushGroup`) which creates an
   empty group, but no way to copy an existing group's brushes into a new group.

The intended outcome: vertical + horizontal dual-handle range sliders beside the chart that zoom
the axes (selections preserved), plus a "Duplicate group" action. Because TimeWidget has almost no
test coverage (only `tests/BVH.test.js`), the work must add a safety net so existing features
don't regress.

## Goals

- Zoom the TimeWidget x-axis (weeks) and y-axis (weight) via dual-handle range sliders.
- Preserve brush selections across zoom changes.
- Duplicate the currently selected brush group, including its brushes.
- Add test coverage for the new logic and confirm existing tests still pass.

## Non-goals

- Interactive scroll/pinch zoom or pan (sliders only, this iteration).
- True viewport clipping on the y-axis (we accept the existing `.clamp(true)` edge-flattening for v1).
- Migrating the bridge pages (`index.md`, `usability*.md`) off the hosted notebook — the zoom UI
  is built and verified on the native `src/timewidget-demo.md` page first, then reused.

## Architecture overview

Work spans two repositories, sequenced TimeWidget-first:

```
ivelascog/TimeWidget (library)
  src/TimeWidget.js        → ts.setDomains({x,y}), ts.fullExtent, ts.duplicateSelectedGroup()
  src/BrushInteraction.js  → me.duplicateBrushGroup(sourceId), cloneBrushGroup() pure helper
  tests/                   → unit tests for new pure logic
        │  (rebuild + vendor via `npm run sync:timewidget`)
        ▼
john-guerra/exploradorCanguro (app)
  src/lib/TimeWidget.esm.js     → refreshed vendored bundle
  src/components/rangeSlider.js → d3 dual-handle slider (reactive-widget-helper)
  src/timewidget-demo.md        → sliders + reset + duplicate button wired to tw.ts
```

## Component design

### 1. TimeWidget: `ts.setDomains({x, y})` (zoom engine)

**Responsibility:** set the active x and/or y domain and re-render in place, keeping brushes.

**Change in `initDomains` (src/TimeWidget.js):** make the x-axis read the public `ts.xDomain`
symmetrically with the y-axis. Today (abridged):

```js
// x — reads private closure `xDomain`
if (!xDomain) xDomain = fixAxis && _this ? _this.extent.x : d3.extent(fData, x);
overviewX.domain(xDomain);
// y — already reads public ts.yDomain
if (!ts.yDomain) ts.yDomain = fixAxis && _this ? _this.extent.y : d3.extent(fData, y);
overviewY.domain(ts.yDomain);
```

becomes, for x:

```js
if (!ts.xDomain) ts.xDomain = fixAxis && _this ? _this.extent.x : d3.extent(fData, x);
overviewX.domain(ts.xDomain);
```

(References to the closure `xDomain` at the two `overviewX.domain(...)` sites switch to `ts.xDomain`.)

**Capture full extent once** (so the app knows slider bounds and can reset). After the first
`initDomains`, record the data extent before any zoom narrows it:

```js
if (!ts.fullExtent) ts.fullExtent = { x: d3.extent(fData, x), y: d3.extent(fData, y) };
```

**Public method:**

```js
ts.setDomains = ({ x, y } = {}) => {
  if (x) ts.xDomain = x;
  if (y) ts.yDomain = y;
  ts.update(); // existing: re-inits domains, re-renders, reapplies brush filters
  return ts;
};
```

- **Consumes:** `x` and/or `y` as `[min, max]` in data coordinates.
- **Produces:** re-rendered widget; `ts.xDomain`/`ts.yDomain` reflect the new domains; brush
  selections preserved (via `ts.update()` → `brushes.addFilters(status, true)`).

**Edge handling:** if `min === max` or `min > max`, normalize to a tiny valid interval
(`[min, min + ε]`) rather than throwing — see pure helper `normalizeDomain` below.

### 2. TimeWidget: duplicate brush group

**Responsibility:** create a new brush group that copies the brushes of a source group.

**Reuse the existing `addFilters` path (verified).** `me.addFilters(filters, wipeAll=false)`
already accepts an array of group payloads shaped
`{ isEnable, isActive, name, brushes: [{ mode, aggregation, selectionDomain }] }` and, for each
brush, materializes it via the internal `newBrush(mode, aggregation, groupId, selectionDomain)`.
With `wipeAll=false` it appends a new group (and re-adds the pending new-TimeBox brush at the end).
So duplication builds a one-group payload from the source group's committed brushes and calls
`addFilters` — no new internal brush-creation function is needed.

**Pure helper (`src/BrushInteraction.js`), independently unit-testable** — produces exactly the
payload `addFilters` consumes, with no d3/DOM references:

```js
export function cloneBrushGroupPayload(group, { suffix = " (copy)" } = {}) {
  const brushes = [];
  for (const [, brush] of group.brushes) {
    if (brush.selection !== null && brush.selectionDomain) {
      brushes.push({
        mode: brush.mode,
        aggregation: brush.aggregation,
        selectionDomain: brush.selectionDomain,
      });
    }
  }
  return { isEnable: true, isActive: false, name: (group.name || "Group") + suffix, brushes };
}
```

**Method on the brush-interaction object:**

```js
me.duplicateBrushGroup = function (sourceId = brushGroupSelected) {
  const source = brushesGroup.get(sourceId);
  if (!source) return;
  const payload = cloneBrushGroupPayload(source);
  if (payload.brushes.length === 0) { me.addBrushGroup(); return; } // nothing committed → empty group
  me.addFilters([payload], false); // appends a new group, materializes copied brushes via newBrush()
  updateStatus();
  updateGroups();
};
```

**Expose on `ts` and in the UI:**

```js
ts.duplicateSelectedGroup = () => { brushes.duplicateBrushGroup(); return ts; };
```

Add a "Duplicate Group" button next to the existing "Add Group" button in the groups control
(same place `addBrushGroup` is wired), so it works without app-side code too.

- **Consumes:** optional `sourceId` (defaults to the selected group).
- **Produces:** a new enabled, selected group whose committed brushes match the source's; triggers
  selection/status/group-UI updates.

### 3. Canguro app: `src/components/rangeSlider.js`

**Responsibility:** a dual-handle range slider that behaves like a reactive input.

```js
import * as d3 from "d3";
import ReactiveWidget from "reactive-widget-helper";

export function rangeSlider({
  domain,                 // [min, max] full bounds
  value = domain,         // initial [lo, hi]
  step = 1,
  orientation = "horizontal", // "horizontal" | "vertical"
  length = 300,           // px along the slider axis
  label = "",
  format = (d) => d,
} = {}) { /* returns element with reactive value [lo, hi], emits "input" */ }
```

- Renders an SVG track with two draggable handles (d3-drag). Horizontal maps value→x; vertical
  maps value→y with an inverted scale (larger value at top, matching the chart's y-axis).
- Drag clamps `lo ≤ hi`, snaps to `step`, calls `widget.setValue([lo, hi])` (dispatches `input`).
- `showValue()` repositions handles when `value` is set externally (reset).
- Wrapped via `ReactiveWidget(el, { value, showValue })` per the verified API
  (see project CLAUDE.md).

**Pure helper, unit-testable in isolation:** `clampRange([lo, hi], domain, step)` → normalized
`[lo, hi]` (ordering, bounds, snap). The drag handler is a thin wrapper around it.

- **Consumes:** config above.
- **Produces:** an HTMLElement whose `.value` is `[lo, hi]` and which emits `input` on change.

### 4. Canguro app: wiring in `src/timewidget-demo.md`

Layout via CSS grid — vertical weight slider in a side column, chart center, horizontal weeks
slider in a row below the chart:

```js
const weekExtent   = d3.extent(data, (d) => d.__time);
const weightExtent = d3.extent(data, (d) => d.peso);

const weeks  = view(rangeSlider({ domain: weekExtent,   value: weekExtent,   orientation: "horizontal", step: 1,   label: "Semanas" }));
const weight = view(rangeSlider({ domain: weightExtent, value: weightExtent, orientation: "vertical",   step: 100, label: "Peso (g)" }));
```

```js
// effect cell — re-zoom whenever a slider changes; selections persist
tw.ts.setDomains({ x: weeks, y: weight });
```

- **Reset zoom** button → set both sliders' value to `tw.ts.fullExtent.x` / `.y` (triggers the
  effect cell). Implemented by calling each slider element's `setValue(...)`.
- **Duplicar grupo** button → `tw.ts.duplicateSelectedGroup()`.

## Data flow

```
[drag handle] → rangeSlider.setValue([lo,hi]) → "input" event
   → Framework view() updates `weeks`/`weight`
   → effect cell: tw.ts.setDomains({x: weeks, y: weight})
   → initDomains() applies ts.xDomain/ts.yDomain → ts.update() re-renders + reapplies brushes
[Duplicar grupo] → tw.ts.duplicateSelectedGroup() → addBrushGroup + recreate brushes → re-render
[Reset] → slider.setValue(fullExtent) → same path as drag
```

## Error handling

- `setDomains` with `min ≥ max` → `normalizeDomain` widens to `[min, min + ε]` (no throw).
- `setDomains({})` (no args) → no-op re-render.
- `duplicateBrushGroup` with unknown/empty source → returns without creating a group.
- Duplicating a group whose only brush is the in-progress (null-selection) brush → new empty group
  (matches "Add Group" behavior); committed brushes only are copied.
- rangeSlider value outside `domain` → clamped by `clampRange`.

## Testing strategy

Existing coverage is thin (only `tests/BVH.test.js`, 12 pure-geometry tests; jest in ESM mode via
`node --experimental-vm-modules`). TimeWidget renders to **canvas**, which jsdom cannot exercise,
so full-render assertions live in the browser layer, not jest.

1. **TimeWidget jest unit tests (new), pure logic only:**
   - `normalizeDomain` — ordering, equal endpoints, ε widening.
   - `cloneBrushGroupPayload` — copies committed brushes' `{mode, aggregation, selectionDomain}`;
     ignores null-selection brushes; appends the name suffix; returns a plain array (no shared Map
     reference) shaped exactly as `addFilters` consumes.
2. **Regression gate:** `npm test` in TimeWidget (BVH suite) must stay green before and after.
3. **Canguro app jest unit test (new):** `clampRange` — ordering, bounds, step snapping.
4. **Browser integration (Playwright against the dev server)** — the proven verification method
   for this project:
   - Drag the weeks slider → x-axis domain shrinks and chart re-renders.
   - Create a brush, then zoom → the brush selection persists.
   - Drag the weight slider → y-axis domain changes.
   - "Reset" → axes return to full extent.
   - "Duplicar grupo" with a brushed group → group count increases by one and the new group has a
     brush at the same coordinates.

## Sequencing / interfaces between repos

1. Implement + test TimeWidget changes (`setDomains`, `fullExtent`, `duplicateSelectedGroup`,
   "Duplicate Group" button) on a branch; PR to `ivelascog/TimeWidget`.
2. `npm run build` in TimeWidget; `npm run sync:timewidget` in the app to refresh
   `src/lib/TimeWidget.esm.js`.
3. Implement `rangeSlider.js`; wire into `timewidget-demo.md`; browser-verify.

**Interface contract the app relies on:**
- `tw.ts.setDomains({x?: [number,number], y?: [number,number]}) → ts`
- `tw.ts.fullExtent → { x: [number,number], y: [number,number] }`
- `tw.ts.duplicateSelectedGroup() → ts`
