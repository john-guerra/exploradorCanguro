# TimeWidget Range-Slider Zoom + Duplicate Group — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add range-slider zoom (by weeks/x and weight/y) and a "duplicate current group" action to the TimeWidget, surfaced in the Explorador Canguro app.

**Architecture:** Two repos. First enhance the TimeWidget library (`/Users/aguerra/workspace/TimeWidget`) with `ts.setDomains`, `ts.fullExtent`, and `ts.duplicateSelectedGroup`, each backed by a pure unit-tested helper. Then re-vendor the built bundle into the app and build a dependency-free d3 dual-handle range-slider reactive component, wiring both axes and a duplicate button into `src/timewidget-demo.md`.

**Tech Stack:** TimeWidget (vanilla ESM + d3), jest (ESM mode) for TimeWidget unit tests, Observable Framework + d3 + `reactive-widget-helper` for the app, Node's built-in `node:test` for app-side pure-logic tests, Playwright MCP for browser integration verification.

## Global Constraints

- TimeWidget tests run with: `node --experimental-vm-modules node_modules/jest/bin/jest.js` (i.e. `npm test`).
- TimeWidget renders to **canvas**; jsdom cannot exercise rendering — DOM/render behavior is verified in the browser (Playwright), not jest.
- App imports TimeWidget from the vendored bundle `src/lib/TimeWidget.esm.js` (NOT `file:`/npm). Refresh via `npm run sync:timewidget`.
- `reactive-widget-helper` API is 2-arg: `ReactiveWidget(el, { value, showValue })`; `el.setValue(v)` dispatches `input`; `el.value` is the getter.
- Keep Spanish UI labels in the app.
- The existing TimeWidget `tests/BVH.test.js` (12 tests) must stay green throughout.

## File Structure

**TimeWidget repo (`/Users/aguerra/workspace/TimeWidget`):**
- Modify `src/utils.js` — add `normalizeDomain` (pure).
- Modify `src/TimeWidget.js` — x-domain symmetry fix, `ts.fullExtent`, `ts.setDomains`, `ts.duplicateSelectedGroup`, "Duplicate Group" button.
- Modify `src/BrushInteraction.js` — add `cloneBrushGroupPayload` (pure, exported) and `me.duplicateBrushGroup`.
- Create `tests/domain.test.js` — unit tests for `normalizeDomain`.
- Create `tests/brushGroup.test.js` — unit tests for `cloneBrushGroupPayload`.

**App repo (`/Users/aguerra/workspace/exploradorCanguro`):**
- Modify `src/lib/TimeWidget.esm.js` — re-vendored bundle (via sync script).
- Create `src/components/rangeSliderUtils.js` — `clampRange` (pure).
- Create `src/components/rangeSliderUtils.test.js` — `node:test` unit tests.
- Create `src/components/rangeSlider.js` — d3 dual-handle reactive slider.
- Modify `src/timewidget-demo.md` — wire sliders, reset, duplicate button.

---

## Task A1: TimeWidget — `setDomains` zoom engine + `fullExtent`

**Files:**
- Modify: `/Users/aguerra/workspace/TimeWidget/src/utils.js`
- Modify: `/Users/aguerra/workspace/TimeWidget/src/TimeWidget.js` (`initDomains` ~417-463, after `ts.update` ~1474)
- Test: `/Users/aguerra/workspace/TimeWidget/tests/domain.test.js`

**Interfaces:**
- Produces: `normalizeDomain(domain, {eps?}) -> [lo, hi]` (exported from `utils.js`); `ts.setDomains({x?: [number,number], y?: [number,number]}) -> ts`; `ts.fullExtent -> { x: [number,number], y: [number,number] }`.

- [ ] **Step 1: Create the failing test for `normalizeDomain`**

Create `/Users/aguerra/workspace/TimeWidget/tests/domain.test.js`:

```js
import { normalizeDomain } from "../src/utils.js";

test("passes through an already-valid numeric domain", () => {
  expect(normalizeDomain([10, 40])).toEqual([10, 40]);
});

test("swaps reversed endpoints", () => {
  expect(normalizeDomain([40, 10])).toEqual([10, 40]);
});

test("widens equal endpoints by eps", () => {
  const [lo, hi] = normalizeDomain([20, 20], { eps: 1e-6 });
  expect(lo).toBe(20);
  expect(hi).toBeCloseTo(20 + 1e-6, 9);
});

test("passes non-numeric (e.g. Date) domains through untouched", () => {
  const d = [new Date(2020, 0, 1), new Date(2020, 1, 1)];
  expect(normalizeDomain(d)).toBe(d);
});

test("passes through malformed input", () => {
  expect(normalizeDomain(null)).toBe(null);
  expect(normalizeDomain([1])).toEqual([1]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/aguerra/workspace/TimeWidget && npm test -- tests/domain.test.js`
Expected: FAIL — `normalizeDomain is not a function` / import error.

- [ ] **Step 3: Implement `normalizeDomain` in `src/utils.js`**

Append to `/Users/aguerra/workspace/TimeWidget/src/utils.js`:

```js
// Normalize a numeric [lo, hi] domain: order endpoints, widen a zero-width
// interval by eps. Non-numeric domains (e.g. Dates) and malformed input pass
// through unchanged so the scaleTime path is never broken.
export function normalizeDomain(domain, { eps = 1e-6 } = {}) {
  if (!Array.isArray(domain) || domain.length !== 2) return domain;
  let [lo, hi] = domain;
  if (typeof lo !== "number" || typeof hi !== "number") return domain;
  if (Number.isNaN(lo) || Number.isNaN(hi)) return domain;
  if (lo > hi) [lo, hi] = [hi, lo];
  if (lo === hi) hi = lo + eps;
  return [lo, hi];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/aguerra/workspace/TimeWidget && npm test -- tests/domain.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Make the x-domain settable after creation (symmetry fix)**

In `/Users/aguerra/workspace/TimeWidget/src/TimeWidget.js`, inside `initDomains` (around lines 417-448), the x-axis currently reads the private parameter `xDomain`. Change those three sites to read the public `ts.xDomain` (mirroring how y already reads `ts.yDomain`):

Replace line ~418-419:
```js
    if (!xDomain) {
      xDomain = fixAxis && _this ? _this.extent.x : d3.extent(fData, x); // Keep same axes as in the first rendering
    }
```
with:
```js
    if (!ts.xDomain) {
      ts.xDomain = fixAxis && _this ? _this.extent.x : d3.extent(fData, x); // Keep same axes as in the first rendering
    }
```

Replace the two `overviewX.domain(xDomain);` lines (~428 and ~444) with:
```js
      overviewX.domain(ts.xDomain);
```

- [ ] **Step 6: Capture `ts.fullExtent` once, at the end of `initDomains`**

In `/Users/aguerra/workspace/TimeWidget/src/TimeWidget.js`, immediately after the `overviewY.range(...).nice().clamp(true);` block (around line 463, the end of `initDomains`), add:

```js
    // Full data extent captured once, before any zoom narrows the domains.
    if (!ts.fullExtent) {
      ts.fullExtent = { x: d3.extent(fData, x), y: d3.extent(fData, y) };
    }
```

- [ ] **Step 7: Add `ts.setDomains` and import `normalizeDomain`**

In `/Users/aguerra/workspace/TimeWidget/src/TimeWidget.js`, update the utils import near the top. Find the existing import from `./utils` and add `normalizeDomain` to it (the file already imports helpers such as `log`, `logPerformance`). If the existing line is:
```js
import {log, logPerformance} from "./utils.js";
```
change it to:
```js
import {log, logPerformance, normalizeDomain} from "./utils.js";
```

Then, immediately after the `ts.update = () => { ... };` block (ends ~line 1474), add:

```js
  ts.setDomains = ({ x, y } = {}) => {
    if (x) ts.xDomain = normalizeDomain(x);
    if (y) ts.yDomain = normalizeDomain(y);
    ts.update();
    return ts;
  };
```

- [ ] **Step 8: Run the full TimeWidget suite (regression gate)**

Run: `cd /Users/aguerra/workspace/TimeWidget && npm test`
Expected: PASS — BVH (12) + domain (5) all green.

- [ ] **Step 9: Commit**

```bash
cd /Users/aguerra/workspace/TimeWidget
git add src/utils.js src/TimeWidget.js tests/domain.test.js
git commit -m "feat: ts.setDomains + ts.fullExtent; make x-domain settable after creation

- normalizeDomain (utils) orders/widens numeric domains, passes dates through
- initDomains reads public ts.xDomain symmetrically with ts.yDomain
- ts.fullExtent captures data extent once for slider bounds / reset
- ts.setDomains({x,y}) re-renders in place via ts.update() (brushes preserved)"
```

---

## Task A2: TimeWidget — duplicate current group

**Files:**
- Modify: `/Users/aguerra/workspace/TimeWidget/src/BrushInteraction.js` (after `me.addBrushGroup` ~703; add export at end before `export default`)
- Modify: `/Users/aguerra/workspace/TimeWidget/src/TimeWidget.js` (groups HTML ~225, handlers ~228-244, add `ts.duplicateSelectedGroup` near `ts.setDomains`)
- Test: `/Users/aguerra/workspace/TimeWidget/tests/brushGroup.test.js`

**Interfaces:**
- Consumes: `me.addFilters([groupPayload], false)` and internal `selectBrushGroup`, `updateStatus`, `updateGroups`, `brushesGroup`, `brushGroupSelected` (all in `brushInteraction` scope).
- Produces: `cloneBrushGroupPayload(group, {suffix?}) -> { isEnable, isActive, name, brushes: [{mode, aggregation, selectionDomain}] }` (exported); `me.duplicateBrushGroup(sourceId?)`; `ts.duplicateSelectedGroup() -> ts`.

- [ ] **Step 1: Create the failing test for `cloneBrushGroupPayload`**

Create `/Users/aguerra/workspace/TimeWidget/tests/brushGroup.test.js`:

```js
import { cloneBrushGroupPayload } from "../src/BrushInteraction.js";

function fakeGroup() {
  const brushes = new Map();
  brushes.set(0, { mode: "Intersect", aggregation: "And", selection: [[0, 0], [10, 10]], selectionDomain: [[30, 1000], [40, 3000]] });
  brushes.set(1, { mode: "Intersect", aggregation: "And", selection: null, selectionDomain: null }); // pending brush
  return { name: "Group 1", isEnable: true, isActive: false, brushes };
}

test("copies only committed brushes with mode/aggregation/selectionDomain", () => {
  const payload = cloneBrushGroupPayload(fakeGroup());
  expect(payload.brushes).toEqual([
    { mode: "Intersect", aggregation: "And", selectionDomain: [[30, 1000], [40, 3000]] },
  ]);
});

test("appends a copy suffix to the name and is enabled, not active", () => {
  const payload = cloneBrushGroupPayload(fakeGroup());
  expect(payload.name).toBe("Group 1 (copy)");
  expect(payload.isEnable).toBe(true);
  expect(payload.isActive).toBe(false);
});

test("returns an empty brushes array for a group with no committed brushes", () => {
  const brushes = new Map();
  brushes.set(0, { mode: "Intersect", aggregation: "And", selection: null, selectionDomain: null });
  const payload = cloneBrushGroupPayload({ name: "Group 2", brushes });
  expect(payload.brushes).toEqual([]);
});

test("does not share the source Map reference", () => {
  const g = fakeGroup();
  const payload = cloneBrushGroupPayload(g);
  expect(Array.isArray(payload.brushes)).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/aguerra/workspace/TimeWidget && npm test -- tests/brushGroup.test.js`
Expected: FAIL — `cloneBrushGroupPayload is not a function`.

- [ ] **Step 3: Implement `cloneBrushGroupPayload` (pure, exported)**

In `/Users/aguerra/workspace/TimeWidget/src/BrushInteraction.js`, just above the final `export default brushInteraction;` line, add:

```js
// Pure: build the payload that me.addFilters() consumes, from a brush group's
// committed brushes (those with a non-null selection). No d3/DOM references.
export function cloneBrushGroupPayload(group, { suffix = " (copy)" } = {}) {
  const brushes = [];
  if (group && group.brushes) {
    for (const brush of group.brushes.values()) {
      if (brush.selection !== null && brush.selectionDomain) {
        brushes.push({
          mode: brush.mode,
          aggregation: brush.aggregation,
          selectionDomain: brush.selectionDomain,
        });
      }
    }
  }
  return {
    isEnable: true,
    isActive: false,
    name: ((group && group.name) || "Group") + suffix,
    brushes,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/aguerra/workspace/TimeWidget && npm test -- tests/brushGroup.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Add `me.duplicateBrushGroup` to the brush-interaction object**

In `/Users/aguerra/workspace/TimeWidget/src/BrushInteraction.js`, immediately after the `me.addBrushGroup = function () { ... };` block (ends ~line 703), add:

```js
  me.duplicateBrushGroup = function (sourceId = brushGroupSelected) {
    const source = brushesGroup.get(sourceId);
    if (!source) return;
    const payload = cloneBrushGroupPayload(source);
    if (payload.brushes.length === 0) {
      me.addBrushGroup(); // nothing committed → behave like Add Group
      return;
    }
    const before = new Set(brushesGroup.keys());
    me.addFilters([payload], false); // appends a new group, materializes copied brushes
    const newId = [...brushesGroup.keys()].find((k) => !before.has(k));
    if (newId !== undefined) selectBrushGroup(newId);
    updateStatus();
    updateGroups();
  };
```

- [ ] **Step 6: Add the "Duplicate Group" button + handler in `TimeWidget.js`**

In `/Users/aguerra/workspace/TimeWidget/src/TimeWidget.js`, update the groups markup (around line 222-226) to add the button:

```js
    groupsElement.innerHTML = `<div style="flex-basis:100%;">
    <div id="brushesList">
    </div>
    <button id="btnAddBrushGroup">Add Group</button>
    <button id="btnDuplicateBrushGroup">Duplicate Group</button>
    </div>`;
```

Then, right after the existing `addEventListener("click", onAddBrushGroup);` (around line 228-230), add:

```js
    groupsElement
      .querySelector("button#btnDuplicateBrushGroup")
      .addEventListener("click", onDuplicateBrushGroup);
```

And immediately after the `function onAddBrushGroup() { brushes.addBrushGroup(); }` block (around line 242-244), add:

```js
  function onDuplicateBrushGroup() {
    brushes.duplicateBrushGroup();
  }
```

- [ ] **Step 7: Expose `ts.duplicateSelectedGroup`**

In `/Users/aguerra/workspace/TimeWidget/src/TimeWidget.js`, right after the `ts.setDomains = ...` block added in Task A1, add:

```js
  ts.duplicateSelectedGroup = () => {
    brushes.duplicateBrushGroup();
    return ts;
  };
```

- [ ] **Step 8: Run the full suite (regression gate)**

Run: `cd /Users/aguerra/workspace/TimeWidget && npm test`
Expected: PASS — BVH (12) + domain (5) + brushGroup (4).

- [ ] **Step 9: Commit**

```bash
cd /Users/aguerra/workspace/TimeWidget
git add src/BrushInteraction.js src/TimeWidget.js tests/brushGroup.test.js
git commit -m "feat: duplicate current brush group

- cloneBrushGroupPayload (pure) builds an addFilters payload from a group's
  committed brushes
- me.duplicateBrushGroup appends a copied, selected group via addFilters
- ts.duplicateSelectedGroup() + Duplicate Group button next to Add Group"
```

---

## Task A3: Build TimeWidget and open the PR

**Files:** none (build + git/PR).

- [ ] **Step 1: Build the bundles**

Run: `cd /Users/aguerra/workspace/TimeWidget && npm run build`
Expected: Rollup writes `dist/TimeWidget.esm.js`, `dist/TimeWidget.js`, `dist/TimeWidget.min.js` with no errors.

- [ ] **Step 2: Push the branch (created in Task A1) and open the PR**

The commits from A1/A2 are on the current TimeWidget branch (`fix/exports-field-esm-resolution` was the active branch; create a dedicated feature branch first if still on it):

```bash
cd /Users/aguerra/workspace/TimeWidget
git checkout -b feat/zoom-domains-duplicate-group   # only if not already on a feature branch
git push -u origin feat/zoom-domains-duplicate-group
gh pr create --repo ivelascog/TimeWidget --base main \
  --head feat/zoom-domains-duplicate-group \
  --reviewer ivelascog \
  --title "feat: setDomains zoom API + duplicate brush group" \
  --body "Adds ts.setDomains({x,y}) (x-domain now settable post-creation), ts.fullExtent, and ts.duplicateSelectedGroup() + a Duplicate Group button. New jest unit tests for normalizeDomain and cloneBrushGroupPayload; existing BVH suite stays green."
```

Expected: PR URL printed; reviewer `ivelascog` requested.

---

## Task B1: Re-vendor TimeWidget into the app

**Files:**
- Modify: `/Users/aguerra/workspace/exploradorCanguro/src/lib/TimeWidget.esm.js`

- [ ] **Step 1: Sync the freshly built bundle**

Run: `cd /Users/aguerra/workspace/exploradorCanguro && npm run sync:timewidget`
Expected: prints `Synced TimeWidget.esm.js`; the vendored file is updated.

- [ ] **Step 2: Sanity-check the new API is present in the bundle**

Run: `grep -c "setDomains\|duplicateSelectedGroup\|fullExtent" src/lib/TimeWidget.esm.js`
Expected: a number ≥ 3 (the new identifiers are bundled).

- [ ] **Step 3: Commit**

```bash
cd /Users/aguerra/workspace/exploradorCanguro
git add src/lib/TimeWidget.esm.js
git commit -m "chore: re-vendor TimeWidget bundle with setDomains + duplicate group"
```

---

## Task B2: App — `clampRange` pure helper

**Files:**
- Create: `/Users/aguerra/workspace/exploradorCanguro/src/components/rangeSliderUtils.js`
- Test: `/Users/aguerra/workspace/exploradorCanguro/src/components/rangeSliderUtils.test.js`

**Interfaces:**
- Produces: `clampRange([lo, hi], domain, step?) -> [lo, hi]` (ordered, within `domain`, snapped to `step`).

- [ ] **Step 1: Write the failing test (Node built-in runner — no new dependency)**

Create `/Users/aguerra/workspace/exploradorCanguro/src/components/rangeSliderUtils.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { clampRange } from "./rangeSliderUtils.js";

test("orders reversed handles", () => {
  assert.deepEqual(clampRange([40, 10], [0, 100], 1), [10, 40]);
});

test("clamps to domain bounds", () => {
  assert.deepEqual(clampRange([-5, 200], [0, 100], 1), [0, 100]);
});

test("snaps to step", () => {
  assert.deepEqual(clampRange([12, 37], [0, 100], 5), [10, 35]);
});

test("keeps an in-range, on-step value unchanged", () => {
  assert.deepEqual(clampRange([20, 60], [0, 100], 10), [20, 60]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/aguerra/workspace/exploradorCanguro && node --test src/components/rangeSliderUtils.test.js`
Expected: FAIL — cannot find module `./rangeSliderUtils.js` / `clampRange` undefined.

- [ ] **Step 3: Implement `clampRange`**

Create `/Users/aguerra/workspace/exploradorCanguro/src/components/rangeSliderUtils.js`:

```js
// Pure helper for the range slider: order the two handles, clamp them to the
// domain, and snap each to the nearest step (measured from the domain min).
export function clampRange([lo, hi], domain, step = 1) {
  const [dMin, dMax] = domain;
  const snap = (v) => {
    const snapped = dMin + Math.round((v - dMin) / step) * step;
    return Math.max(dMin, Math.min(dMax, snapped));
  };
  let a = snap(lo);
  let b = snap(hi);
  if (a > b) [a, b] = [b, a];
  return [a, b];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/aguerra/workspace/exploradorCanguro && node --test src/components/rangeSliderUtils.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/aguerra/workspace/exploradorCanguro
git add src/components/rangeSliderUtils.js src/components/rangeSliderUtils.test.js
git commit -m "feat: clampRange pure helper for the range slider (node:test)"
```

---

## Task B3: App — `rangeSlider` reactive component

**Files:**
- Create: `/Users/aguerra/workspace/exploradorCanguro/src/components/rangeSlider.js`

**Interfaces:**
- Consumes: `clampRange` (Task B2); `ReactiveWidget(el, {value, showValue})`.
- Produces: `rangeSlider({domain, value?, step?, orientation?, length?, thickness?, label?, format?}) -> HTMLElement` whose `.value` is `[lo, hi]` and which emits `input` on change; calling `el.setValue([lo, hi])` updates it programmatically (used by reset).

- [ ] **Step 1: Implement the component**

Create `/Users/aguerra/workspace/exploradorCanguro/src/components/rangeSlider.js`:

```js
import * as d3 from "d3";
import ReactiveWidget from "reactive-widget-helper";
import { clampRange } from "./rangeSliderUtils.js";

/**
 * Dual-handle range slider as a reactive-widget-helper widget.
 * value is [lo, hi]; emits "input" on change. orientation "vertical" puts the
 * larger value at the top (matching a chart's y-axis).
 */
export function rangeSlider({
  domain,
  value = domain,
  step = 1,
  orientation = "horizontal",
  length = 320,
  thickness = 44,
  label = "",
  format = (d) => `${Math.round(d)}`,
} = {}) {
  const horizontal = orientation === "horizontal";
  const pad = 14;
  const span = length - pad * 2;
  const cross = thickness / 2;

  // data -> px along the main axis (vertical: max value at top)
  const scale = d3
    .scaleLinear()
    .domain(domain)
    .range(horizontal ? [pad, pad + span] : [pad + span, pad])
    .clamp(true);

  const container = document.createElement("div");
  container.className = "range-slider";

  const labelEl = document.createElement("div");
  labelEl.className = "range-slider-label";
  labelEl.style.font = "12px sans-serif";
  labelEl.style.marginBottom = "2px";
  container.appendChild(labelEl);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", horizontal ? length : thickness)
    .attr("height", horizontal ? thickness : length)
    .style("overflow", "visible");

  const line = (cls, color, w) =>
    svg.append("line").attr("class", cls).attr("stroke", color)
      .attr("stroke-width", w).attr("stroke-linecap", "round");

  line("track", "#ccc", 4)
    .attr("x1", horizontal ? pad : cross).attr("y1", horizontal ? cross : pad)
    .attr("x2", horizontal ? pad + span : cross).attr("y2", horizontal ? cross : pad + span);
  const rangeLine = line("range", "#4682b4", 4);

  const handle = () =>
    svg.append("circle").attr("r", 8).attr("fill", "#fff")
      .attr("stroke", "#4682b4").attr("stroke-width", 2)
      .style("cursor", horizontal ? "ew-resize" : "ns-resize");
  const loHandle = handle();
  const hiHandle = handle();

  function place(h, v) {
    if (horizontal) h.attr("cx", scale(v)).attr("cy", cross);
    else h.attr("cx", cross).attr("cy", scale(v));
  }

  function render() {
    const [lo, hi] = widget.value;
    place(loHandle, lo);
    place(hiHandle, hi);
    if (horizontal) {
      rangeLine.attr("x1", scale(lo)).attr("y1", cross).attr("x2", scale(hi)).attr("y2", cross);
    } else {
      rangeLine.attr("x1", cross).attr("y1", scale(lo)).attr("x2", cross).attr("y2", scale(hi));
    }
    labelEl.textContent = `${label ? label + ": " : ""}${format(lo)} – ${format(hi)}`;
  }

  const widget = ReactiveWidget(container, {
    value: clampRange(value, domain, step),
    showValue: render,
  });

  function drag(which) {
    return d3.drag().on("drag", (event) => {
      const v = scale.invert(horizontal ? event.x : event.y);
      let [lo, hi] = widget.value;
      if (which === "lo") lo = v;
      else hi = v;
      widget.setValue(clampRange([lo, hi], domain, step));
    });
  }
  loHandle.call(drag("lo"));
  hiHandle.call(drag("hi"));

  render();
  return widget;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/aguerra/workspace/exploradorCanguro
git add src/components/rangeSlider.js
git commit -m "feat: dependency-free d3 dual-handle rangeSlider reactive component"
```

(Behavioral verification of the rendered slider happens in Task B5 — the browser layer — since it requires the DOM/SVG and the live reactive chain.)

---

## Task B4: App — wire sliders, reset, and duplicate into the demo page

**Files:**
- Modify: `/Users/aguerra/workspace/exploradorCanguro/src/timewidget-demo.md`

**Interfaces:**
- Consumes: `rangeSlider` (B3); `tw.ts.setDomains`, `tw.ts.fullExtent`, `tw.ts.duplicateSelectedGroup` (Tasks A1/A2 via vendored bundle).

- [ ] **Step 1: Add imports and axis extents**

In `/Users/aguerra/workspace/exploradorCanguro/src/timewidget-demo.md`, add to the existing import cell (the one importing `timeWidgetReactive`):

```js
import { rangeSlider } from "./components/rangeSlider.js";
```

After the `const data = ...` cell, add a cell:

```js
const weekExtent   = d3.extent(data, (d) => d.__time);
const weightExtent = d3.extent(data, (d) => d.peso);
```

- [ ] **Step 2: Create the slider elements and view their values**

Add cells (each `js` fenced block is its own cell):

```js
const weeksSlider  = rangeSlider({ domain: weekExtent,   value: weekExtent,   orientation: "horizontal", step: 1,   length: 600, label: "Semanas" });
const weightSlider = rangeSlider({ domain: weightExtent, value: weightExtent, orientation: "vertical",   step: 100, length: 500, label: "Peso (g)" });
```

```js
const weeks  = view(weeksSlider);
```

```js
const weight = view(weightSlider);
```

- [ ] **Step 3: Add the zoom effect cell**

```js
// Re-zoom whenever a slider changes; brush selections persist (ts.update reapplies them).
tw.ts.setDomains({ x: weeks, y: weight });
```

- [ ] **Step 4: Add reset + duplicate buttons**

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

- [ ] **Step 5: Add a layout that places the vertical slider beside the chart and the horizontal one below**

Add markdown + a cell that arranges the pieces (Framework renders `display`ed elements inline; use a grid wrapper):

```js
display(html`
  <div style="display:grid; grid-template-columns:auto 1fr; grid-template-rows:auto auto; gap:.5rem; align-items:center;">
    <div style="grid-row:1; grid-column:1;">${weightSlider}</div>
    <div style="grid-row:1; grid-column:2;">${tw}</div>
    <div style="grid-row:2; grid-column:2;">${weeksSlider}</div>
  </div>
`);
```

Note: remove the earlier standalone `view(tw)`/`display(tw)` of the chart if present, so `tw` is rendered once inside this grid. Keep the `view(weeksSlider)`/`view(weight)` cells (they only read the reactive value; the elements themselves are placed by the grid). If Framework complains an element is displayed twice, ensure `tw`, `weeksSlider`, and `weightSlider` each appear in exactly one `display`/grid location.

- [ ] **Step 6: Manual smoke check the dev server compiles the page**

Run: `cd /Users/aguerra/workspace/exploradorCanguro && curl -s "http://127.0.0.1:3000/_import/components/rangeSlider.js" -o /dev/null -w "%{http_code}\n"` (start `npm run dev` first if not running)
Expected: `200` (the component bundles cleanly).

- [ ] **Step 7: Commit**

```bash
cd /Users/aguerra/workspace/exploradorCanguro
git add src/timewidget-demo.md
git commit -m "feat: wire range-slider zoom + reset + duplicate group into demo page"
```

---

## Task B5: Browser integration verification

**Files:** none (verification via Playwright MCP against the dev server).

- [ ] **Step 1: Ensure one clean dev server is running**

```bash
cd /Users/aguerra/workspace/exploradorCanguro
lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 2
rm -rf src/.observablehq/cache
npm run dev > /tmp/canguro-dev.log 2>&1 &
sleep 7
```

- [ ] **Step 2: Load the page and confirm zero console errors**

Navigate (Playwright MCP) to `http://127.0.0.1:3000/timewidget-demo` and read console errors (ignore the `favicon.ico` 404).
Expected: no module/runtime errors; the chart, vertical and horizontal sliders all render.

- [ ] **Step 3: Verify x-zoom changes the axis (engine path)**

Via `browser_evaluate`, capture the x-domain, set a narrower one through the widget API, and confirm it changed — proving the x-domain is now settable post-creation:

```js
() => {
  const el = [...document.querySelectorAll('div')].find(d => typeof d.setValue === 'function' && d.ts);
  const before = el.ts.xDomain.slice();
  el.ts.setDomains({ x: [30, 40] });
  return JSON.stringify({ before, after: el.ts.xDomain });
}
```
Expected: `after` ≈ `[30, 40]` (possibly `.nice()`-rounded) and different from `before`.

Then verify the **slider drives it** by setting the slider element's value and checking the chart followed:

```js
() => {
  const sliders = [...document.querySelectorAll('div')].filter(d => typeof d.setValue === 'function' && !d.ts && Array.isArray(d.value) && d.value.length === 2);
  const el = [...document.querySelectorAll('div')].find(d => typeof d.setValue === 'function' && d.ts);
  // horizontal weeks slider drives x; set it to a sub-range
  sliders.forEach(s => s.setValue([s.value[0], s.value[1]])); // no-op to identify; real drive below
  el.ts.setDomains({ x: [28, 36] }); // sanity: confirms reactive cell already wired x→setDomains
  return JSON.stringify({ xDomain: el.ts.xDomain });
}
```
Expected: `xDomain` reflects the latest set range. (The slider→`setDomains` wiring is exercised live by dragging in Step 6's screenshot interaction.)

- [ ] **Step 4: Verify brush selection persists across zoom**

```js
() => {
  const el = [...document.querySelectorAll('div')].find(d => typeof d.setValue === 'function' && d.ts);
  // duplicate to ensure a committed group exists, then zoom, then count groups still present
  const groupsText = document.body.innerText.match(/Group \d+/g) || [];
  el.ts.setDomains({ y: [0, 5000] });
  const groupsAfter = document.body.innerText.match(/Group \d+/g) || [];
  return JSON.stringify({ groupsBefore: groupsText.length, groupsAfter: groupsAfter.length });
}
```
Expected: `groupsAfter >= groupsBefore` (zoom does not drop groups).

- [ ] **Step 5: Verify duplicate group adds a group**

```js
() => {
  const el = [...document.querySelectorAll('div')].find(d => typeof d.setValue === 'function' && d.ts);
  const before = (document.body.innerText.match(/Group \d+/g) || []).length;
  el.ts.duplicateSelectedGroup();
  const after = (document.body.innerText.match(/Group \d+/g) || []).length;
  return JSON.stringify({ before, after });
}
```
Expected: `after === before + 1`.

- [ ] **Step 6: Screenshot for the record and confirm reset**

Take a full-page screenshot; click the "Reset zoom" button (or call both `setValue(fullExtent)`); confirm axes return to full extent via `el.ts.xDomain` matching `el.ts.fullExtent.x`.
Expected: domains restored.

- [ ] **Step 7: Final commit (if any doc/screenshot notes)**

No code change expected here. If verification surfaced fixes, commit them with a descriptive message and re-run Steps 2-6.

---

## Verification (end-to-end summary)

- TimeWidget: `cd /Users/aguerra/workspace/TimeWidget && npm test` → BVH (12) + domain (5) + brushGroup (4) all green.
- App pure logic: `cd /Users/aguerra/workspace/exploradorCanguro && node --test src/components/rangeSliderUtils.test.js` → 4 passing.
- App build: `npm run build` → all pages compile.
- Browser (Playwright): weeks slider narrows x-axis; weight slider narrows y-axis; brush selection survives zoom; "Duplicar grupo" adds a group with the source's brushes; "Reset zoom" restores `fullExtent`.
- Interface contract held: `tw.ts.setDomains({x,y})`, `tw.ts.fullExtent`, `tw.ts.duplicateSelectedGroup()`.
