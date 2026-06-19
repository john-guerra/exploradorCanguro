# index.md Migration — Phase 0 (anonymized data loader) + Phase 1 (native chart) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hosted-notebook bridge in `src/index.md` with native Observable Framework code: a build-time data loader that emits a slim, de-identified time-series dataset, and a native TimeWidget chart with x/y zoom on it.

**Architecture:** A pure reshape/anonymize module (`src/data/anonymize.js`) turns the raw 673-column wide export into long-format rows `{id,__stageName,__stageId,__time,sex,peso,talla,PC}` using the notebook's `stages` mapping, with surrogate ids and a k-anonymity report. A thin Framework data loader (`src/data/canguro.csv.js`) wraps it. `src/index.md` then renders the existing `timeWidgetReactive` + `rangeSlider` components on the emitted `data/canguro.csv`.

**Tech Stack:** Observable Framework, Node data loaders, `d3` (CSV parse/format via `csvParse`/`csvFormat`), Node built-in `node:test`, the existing vendored TimeWidget (with `setDomains`) + `rangeSlider` components, Playwright for browser verification.

## Global Constraints

- This work depends on components only present on branch `feat/timewidget-zoom-duplicate` (the vendored TimeWidget with `ts.setDomains`/`ts.fullExtent`/`ts.duplicateSelectedGroup`, `src/components/timeWidgetReactive`, `src/components/rangeSlider.js`). Build on a branch created off `feat/timewidget-zoom-duplicate`.
- The anonymized output must contain ONLY these columns: `id,__stageName,__stageId,__time,sex,peso,talla,PC`. No dates, locations, free text, parental, or socioeconomic columns. (Privacy guard — verbatim from the spec.)
- Surrogate ids replace the raw `Code`; the id↔Code map is never exported.
- Raw input is gitignored; the generated `src/data/canguro.csv` stays gitignored until governance sign-off.
- `dataF` filter: keep wide rows with `20 < ERN_Ballard < 50`. Window filter: keep output rows with `20 < __time < 93` and `peso != null && peso < 15000`.
- App-side pure-logic tests use Node's built-in runner: `node --test`.
- Do not commit the real patient data (raw or anonymized) in this phase.

## File Structure

- `src/data/anonymize.js` — pure: `STAGES`, `OUTPUT_COLUMNS`, `buildAnonRows(rawRows, stages?, {k}?)`. One responsibility: reshape + anonymize + report. No I/O.
- `src/data/anonymize.test.js` — `node:test` unit tests for `buildAnonRows`.
- `src/data/canguro.csv.js` — Framework data loader: read raw CSV (`CANGURO_RAW`), call `buildAnonRows`, write CSV to stdout, report to stderr. Thin I/O wrapper only.
- `src/index.md` — rewritten native page (replaces the bridge body), reusing existing components.
- `.gitignore` — add the repo-root raw `data/` and the generated `src/data/canguro.csv`.

---

## Task 1: Pure anonymize/reshape module

**Files:**
- Create: `src/data/anonymize.js`
- Test: `src/data/anonymize.test.js`

**Interfaces:**
- Produces: `STAGES` (array); `OUTPUT_COLUMNS = ["id","__stageName","__stageId","__time","sex","peso","talla","PC"]`; `buildAnonRows(rawRows, stages = STAGES, { k = 5 } = {}) -> { rows, report, missingCols }` where `rows` are objects keyed exactly by `OUTPUT_COLUMNS`, `report = { patients, rows, kAnon: { k, violatingPatients } }`, `missingCols` is a string array.

- [ ] **Step 1: Create the feature branch off `feat/timewidget-zoom-duplicate`**

```bash
cd /Users/aguerra/workspace/exploradorCanguro
git checkout feat/timewidget-zoom-duplicate
git checkout -b feat/index-native-migration
```
Expected: on `feat/index-native-migration`.

- [ ] **Step 2: Write the failing test**

Create `src/data/anonymize.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAnonRows, OUTPUT_COLUMNS } from "./anonymize.js";

// Two synthetic patients. Birth stage uses time column ERN_Ballard; "Semana 40"
// uses fixed time 40. P2 has an out-of-window weight that must be dropped.
function rawFixture() {
  return [
    {
      Code: "ABC-1", ERN_Sexo: "1", ERN_Ballard: "30",
      ERN_Peso: "1500", ERN_Talla: "40", ERN_PC: "28",
      V218: "3000", V219: "50", V220: "35",     // Semana 40 (time 40)
    },
    {
      Code: "ABC-2", ERN_Sexo: "2", ERN_Ballard: "32",
      ERN_Peso: "1800", ERN_Talla: "42", ERN_PC: "29",
      V218: "20000", V219: "51", V220: "36",    // peso 20000 -> dropped by window
    },
    {
      Code: "ABC-3", ERN_Sexo: "1", ERN_Ballard: "10", // ERN_Ballard 10 -> dropped by dataF
      ERN_Peso: "1000", ERN_Talla: "38", ERN_PC: "26",
    },
  ];
}

test("reshapes wide rows to long rows per stage with mapped peso/talla/PC", () => {
  const { rows } = buildAnonRows(rawFixture());
  // Birth (Nacimiento, time=ERN_Ballard=30) for P1
  const birth = rows.find((r) => r.id === "P000001" && r.__stageName === "Nacimiento");
  assert.equal(birth.__time, 30);
  assert.equal(birth.peso, 1500);
  assert.equal(birth.talla, 40);
  assert.equal(birth.PC, 28);
  // Semana 40 uses fixed time 40
  const s40 = rows.find((r) => r.id === "P000001" && r.__stageName === "Semana 40");
  assert.equal(s40.__time, 40);
  assert.equal(s40.peso, 3000);
});

test("drops rows outside the analysis window (peso >= 15000)", () => {
  const { rows } = buildAnonRows(rawFixture());
  const p2s40 = rows.find((r) => r.id === "P000002" && r.__stageName === "Semana 40");
  assert.equal(p2s40, undefined); // 20000 dropped
});

test("excludes patients failing the dataF ERN_Ballard filter", () => {
  const { rows } = buildAnonRows(rawFixture());
  // ABC-3 (Ballard 10) gets no surrogate / no rows
  assert.equal(rows.some((r) => r.id === "P000003"), false);
});

test("surrogate ids are stable per patient and never equal the raw Code", () => {
  const { rows } = buildAnonRows(rawFixture());
  const p1 = rows.filter((r) => r.id === "P000001");
  assert.ok(p1.length >= 1);
  assert.ok(rows.every((r) => !String(r.id).includes("ABC")));
});

test("output rows contain ONLY the allowed columns (no PII leakage)", () => {
  const { rows } = buildAnonRows(rawFixture());
  for (const r of rows) {
    assert.deepEqual(Object.keys(r).sort(), [...OUTPUT_COLUMNS].sort());
  }
});

test("report includes patient/row counts and a k-anonymity violation count", () => {
  const { report } = buildAnonRows(rawFixture(), undefined, { k: 5 });
  assert.equal(report.patients, 2);          // P1 + P2 produce output; P3 filtered
  assert.ok(report.rows >= 1);
  assert.equal(report.kAnon.k, 5);
  assert.ok(report.kAnon.violatingPatients >= 0);
});

test("missing wide columns are reported, not thrown", () => {
  const { missingCols } = buildAnonRows([{ Code: "X", ERN_Ballard: "30", ERN_Sexo: "1", ERN_Peso: "1500" }]);
  assert.ok(Array.isArray(missingCols));
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test src/data/anonymize.test.js`
Expected: FAIL — cannot find module `./anonymize.js` / `buildAnonRows` undefined.

- [ ] **Step 4: Implement `src/data/anonymize.js`**

Create `src/data/anonymize.js`:

```js
// Pure reshape + de-identification for the Kangaroo patient export.
// Wide (673-col) rows -> slim long-format rows the chart consumes, with
// surrogate ids and a k-anonymity report. No I/O, no PII columns emitted.

export const OUTPUT_COLUMNS = ["id", "__stageName", "__stageId", "__time", "sex", "peso", "talla", "PC"];

// Verbatim stage map from notebook sub-module b205fb52cf643a23@269.js (_stages).
export const STAGES = [
  { id: 0, name: "Entorno", variables: [] },
  { id: 1, name: "Embarazo y pre-parto", variables: [] },
  { id: 2, time: "ERN_Ballard", name: "Nacimiento", variables: [
    { name: "peso", var: "ERN_Peso" }, { name: "talla", var: "ERN_Talla" }, { name: "PC", var: "ERN_PC" } ] },
  { id: 3, time: "gestasal", name: "hosp-neonatal", variables: [ { name: "peso", var: "HD_PesoSalida" } ] },
  { id: 4, time: "egestasalPC", name: "Entrada Programa Canguro", variables: [
    { name: "peso", var: "V196A" }, { name: "talla", var: "V196B" }, { name: "PC", var: "V196C" } ] },
  { id: 5, time: 40, name: "Semana 40", variables: [
    { name: "peso", var: "V218" }, { name: "talla", var: "V219" }, { name: "PC", var: "V220" } ] },
  { id: 6, time: 53, name: "Mes 3", variables: [
    { name: "peso", var: "V261" }, { name: "talla", var: "V262" }, { name: "PC", var: "V263" } ] },
  { id: 7, time: 66, name: "Mes 6", variables: [
    { name: "peso", var: "V304" }, { name: "talla", var: "V305" }, { name: "PC", var: "V306" } ] },
  { id: 8, time: 79, name: "Mes 9", variables: [
    { name: "peso", var: "V347" }, { name: "talla", var: "V348" }, { name: "PC", var: "V349" } ] },
  { id: 9, time: 92, name: "Mes 12", variables: [
    { name: "peso", var: "V389" }, { name: "talla", var: "V390" }, { name: "PC", var: "V391" } ] },
];

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = +v;
  return Number.isNaN(n) ? null : n;
}

export function buildAnonRows(rawRows, stages = STAGES, { k = 5 } = {}) {
  const missingCols = new Set();

  // 1. dataF filter: 20 < ERN_Ballard < 50
  const patients = rawRows.filter((r) => {
    const b = num(r.ERN_Ballard);
    return b !== null && b > 20 && b < 50;
  });

  // 2. surrogate id per distinct Code, first-seen order
  const idMap = new Map();
  const surrogate = (code) => {
    if (!idMap.has(code)) idMap.set(code, "P" + String(idMap.size + 1).padStart(6, "0"));
    return idMap.get(code);
  };

  // 3. reshape wide -> long + 4. window filter
  const rows = [];
  for (const stage of stages) {
    if (!stage.variables || stage.variables.length === 0) continue;
    for (const r of patients) {
      if (typeof stage.time === "string" && !(stage.time in r)) missingCols.add(stage.time);
      const time = typeof stage.time === "number" ? stage.time : num(r[stage.time]);
      const out = {
        id: surrogate(r.Code),
        __stageName: stage.name,
        __stageId: stage.id,
        __time: time,
        sex: num(r.ERN_Sexo),
        peso: null, talla: null, PC: null,
      };
      for (const v of stage.variables) {
        if (!(v.var in r)) missingCols.add(v.var);
        out[v.name] = num(r[v.var]);
      }
      if (out.__time !== null && out.__time > 20 && out.__time < 93 && out.peso !== null && out.peso < 15000) {
        rows.push(out);
      }
    }
  }

  // 5. privacy report: k-anonymity on the birth-stage quasi-identifier tuple,
  //    over patients that actually appear in the output.
  const outIds = new Set(rows.map((r) => r.id));
  const wideById = new Map();
  for (const r of patients) {
    const id = idMap.get(r.Code);
    if (id && outIds.has(id) && !wideById.has(id)) wideById.set(id, r);
  }
  const tupleCount = new Map();
  const idTuple = new Map();
  for (const [id, r] of wideById) {
    const tuple = [num(r.ERN_Sexo), Math.round((num(r.ERN_Peso) ?? 0) / 100) * 100, Math.round(num(r.ERN_Ballard) ?? 0)].join("|");
    idTuple.set(id, tuple);
    tupleCount.set(tuple, (tupleCount.get(tuple) || 0) + 1);
  }
  let violatingPatients = 0;
  for (const [, tuple] of idTuple) if (tupleCount.get(tuple) < k) violatingPatients++;

  return {
    rows,
    report: { patients: outIds.size, rows: rows.length, kAnon: { k, violatingPatients } },
    missingCols: [...missingCols],
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test src/data/anonymize.test.js`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/anonymize.js src/data/anonymize.test.js
git commit -m "feat: pure anonymize/reshape module for Kangaroo data (node:test)"
```

---

## Task 2: Data loader + raw extraction + gitignore

**Files:**
- Create: `src/data/canguro.csv.js`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `buildAnonRows`, `OUTPUT_COLUMNS` from `./anonymize.js`.
- Produces: at build, `data/canguro.csv` (served path) with header `id,__stageName,__stageId,__time,sex,peso,talla,PC`.

- [ ] **Step 1: Gitignore the raw and generated data**

Add to `.gitignore`:

```
# Raw patient export (PII) — obtain separately, never commit
/data/
# Generated anonymized dataset — keep build-generated until governance sign-off
src/data/canguro.csv
```

- [ ] **Step 2: Extract the raw KMC-50k CSV to `data/KMC-50k.csv`**

```bash
cd /Users/aguerra/workspace/exploradorCanguro
mkdir -p data
tar -xzf notebooks/explorador-canguro.tgz -O \
  'files/c8e1755722d63b66ac646c206183a42e8d4308dd83438f6e6cc606c5ceda14d7f63ea82db619867fd581b14e466dcc9b2639171dff7e82be1f597474c91d533d.zip' > /tmp/kmc.zip
unzip -p /tmp/kmc.zip "*.csv" > data/KMC-50k.csv
head -1 data/KMC-50k.csv | tr ',' '\n' | grep -c .   # sanity: ~673 columns
wc -l data/KMC-50k.csv                                 # sanity: ~56889 rows
```
Expected: a multi-thousand-row CSV at `data/KMC-50k.csv`.

- [ ] **Step 3: Implement the data loader**

Create `src/data/canguro.csv.js`:

```js
// Framework data loader: read the raw (gitignored) patient export, de-identify +
// reshape via ./anonymize.js, write the slim anonymized CSV to stdout. A privacy
// report goes to stderr (visible in build logs), not into the published data.
import { readFileSync } from "node:fs";
import { csvParse, csvFormat } from "d3"; // d3 is a direct dependency; it re-exports d3-dsv
import { buildAnonRows, OUTPUT_COLUMNS } from "./anonymize.js";

const rawPath = process.env.CANGURO_RAW || "./data/KMC-50k.csv";

let text;
try {
  text = readFileSync(rawPath, "utf8");
} catch {
  process.stderr.write(
    `[canguro loader] raw input not found at ${rawPath}.\n` +
    `Extract it first (see plan Task 2) or set CANGURO_RAW.\n`
  );
  process.exit(1);
}

const rawRows = csvParse(text);
const { rows, report, missingCols } = buildAnonRows(rawRows);

process.stderr.write(`[canguro loader] ${JSON.stringify(report)}\n`);
if (missingCols.length) {
  process.stderr.write(`[canguro loader] missing wide columns (skipped): ${missingCols.join(", ")}\n`);
}

process.stdout.write(csvFormat(rows, OUTPUT_COLUMNS));
```

- [ ] **Step 4: Verify the loader builds the dataset**

Run:
```bash
npm run build 2>build.err.log
echo "--- report (stderr) ---"; grep "canguro loader" build.err.log
echo "--- output header ---"; head -1 dist/data/canguro.csv 2>/dev/null || head -1 src/.observablehq/cache/data/canguro.csv 2>/dev/null
echo "--- output rows ---"; ( [ -f dist/data/canguro.csv ] && wc -l dist/data/canguro.csv )
rm -f build.err.log
```
Expected: stderr shows the report JSON (`patients`, `rows`, `kAnon`); the output header is exactly `id,__stageName,__stageId,__time,sex,peso,talla,PC`; rows > 0.

- [ ] **Step 5: Commit (loader + gitignore only — NOT the data)**

```bash
git add .gitignore src/data/canguro.csv.js
git status --short   # confirm no data/*.csv or src/data/canguro.csv staged
git commit -m "feat: canguro.csv data loader (de-identified, build-generated)"
```

---

## Task 3: Native index.md (Phase 1 chart)

**Files:**
- Modify: `src/index.md` (replace the bridge body)

**Interfaces:**
- Consumes: `data/canguro.csv` (Task 2); `timeWidgetReactive` from `./components/timeWidget.js`; `rangeSlider` from `./components/rangeSlider.js`; existing `src/data/curvas.json` (Fenton/WHO weight curves); `tw.ts.setDomains`/`fullExtent`/`duplicateSelectedGroup` (vendored TimeWidget).

- [ ] **Step 1: Replace `src/index.md` with the native page**

Overwrite `src/index.md` with:

````markdown
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
````

- [ ] **Step 2: Confirm the page compiles**

```bash
cd /Users/aguerra/workspace/exploradorCanguro
lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 2
rm -rf src/.observablehq/cache
npm run dev > /tmp/canguro-dev.log 2>&1 &
sleep 8
curl -s "http://127.0.0.1:3000/" -o /dev/null -w "index HTTP: %{http_code}\n"
grep -iE "error" /tmp/canguro-dev.log | tail
```
Expected: `index HTTP: 200`; no compile errors for `/index` in the log.

- [ ] **Step 3: Commit**

```bash
git add src/index.md
git commit -m "feat: native index.md (TimeWidget + x/y zoom) replacing the hosted-notebook bridge"
```

---

## Task 4: Browser integration verification

**Files:** none (Playwright against the dev server).

- [ ] **Step 1: Load index and confirm zero console errors + no localhost:8080**

Navigate (Playwright) to `http://127.0.0.1:3000/` and read console errors (ignore `favicon.ico`).
Expected: no module/runtime errors; specifically **no request to `http://localhost:8080/...`** (the bridge's TimeSearcher leak is gone).

- [ ] **Step 2: Confirm the chart + sliders rendered on real anonymized data**

Via `browser_evaluate`:
```js
() => {
  const tw = [...document.querySelectorAll('div')].find(d => typeof d.setValue === 'function' && d.ts);
  const sliders = [...document.querySelectorAll('div')].filter(d => typeof d.setValue === 'function' && !d.ts && Array.isArray(d.value));
  return JSON.stringify({ hasChart: !!tw, sliderCount: sliders.length, xDomain: tw && tw.ts.xDomain, fullExtent: tw && tw.ts.fullExtent });
}
```
Expected: `hasChart: true`, `sliderCount: 2`, a numeric `xDomain` and `fullExtent`.

- [ ] **Step 3: Confirm zoom works on the page**

Via `browser_evaluate`:
```js
() => {
  const tw = [...document.querySelectorAll('div')].find(d => typeof d.setValue === 'function' && d.ts);
  const before = tw.ts.xDomain.slice();
  tw.ts.setDomains({ x: [30, 40] });
  return JSON.stringify({ before, after: tw.ts.xDomain });
}
```
Expected: `after` ≈ `[30, 40]`, different from `before`.

- [ ] **Step 4: Screenshot for the record, then no commit needed**

Take a full-page screenshot. If verification surfaced issues, fix and re-run Steps 1-3. No code change expected here.

---

## Verification (end-to-end summary)

- `node --test src/data/anonymize.test.js` → 7 passing; the "only allowed columns" test guards against PII leakage.
- `npm run build` → emits `data/canguro.csv` (header exactly `id,__stageName,__stageId,__time,sex,peso,talla,PC`, rows > 0); stderr shows the k-anonymity report.
- `git status` → neither `data/*.csv` (raw) nor `src/data/canguro.csv` (generated) are tracked.
- Browser: `index.md` renders the native TimeWidget on anonymized data; x and y zoom change the axes; reference curves overlay; no `localhost:8080` request; zero console errors.
- Interface contract held: output columns, `buildAnonRows` shape, native page reuses `timeWidgetReactive` + `rangeSlider`.

## Notes for later phases (not in scope here)

- Phase 2 (groups): port `searchCheckbox` + `FacetedSearch` to define G1/G2 → feed `groupAttr`/brush groups.
- Phase 3 (panels): port `StatisticalCard`, `comparisionCard`, `FacetViolinPlot` driven by the brush selection.
- Data-source swap to `data/Base_Canguro_2025.csv` needs a column remap (`Iden_Codigo` vs `Code`, verify `ERN_*`/`V###` presence) — set `CANGURO_RAW` and extend `STAGES`/field names as needed.
