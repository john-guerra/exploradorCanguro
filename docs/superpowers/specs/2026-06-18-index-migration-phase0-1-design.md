# Migrating index.md off the hosted notebook — Phase 0 (anonymized data loader) + Phase 1 (native chart) — Design

**Date:** 2026-06-18
**Status:** Approved (design); pending implementation plan
**Author:** John Alexis Guerra Gómez (with Claude)

## Context

`src/index.md` currently renders the hosted Observable notebook
`@john-guerra/explorador-canguro@972` through the Observable Runtime (a "bridge").
That notebook pulls a 673-column patient CSV, reshapes it, and draws the old
`TimeSearcher` widget (which also hard-codes a `http://localhost:8080` dependency that
404s in production). The goal is to migrate `index.md` to native Observable Framework code
that owns its data and uses our native **TimeWidget** (with the new zoom + duplicate-group
features from branch `feat/timewidget-zoom-duplicate`).

The full migration is large (a data pipeline plus ~5 custom D3 components: `searchCheckbox`,
`FacetedSearch`, `StatisticalCard`, `comparisionCard`, `FacetViolinPlot`). It is therefore
**decomposed into phases**, each independently working and testable:

- **Phase 0 — Anonymized data loader** (this spec)
- **Phase 1 — Core native chart + zoom** (this spec)
- **Phase 2 — Group definition** (`searchCheckbox` + `FacetedSearch`) — future spec
- **Phase 3 — Analytical panels** (`StatisticalCard`, `comparisionCard`, `FacetViolinPlot`) — future spec

This spec covers **Phase 0 + Phase 1**: produce a publishable, de-identified dataset and a
working, zoomable native main page on it.

## Goals

- A Framework data loader that turns the raw 673-column patient export into a slim,
  de-identified, long-format time-series dataset safe to commit/publish.
- `index.md` rendered natively (no hosted notebook, no `localhost:8080`): the TimeWidget
  weight chart with x (weeks) and y (weight) zoom sliders and Fenton/WHO reference curves.

## Non-goals (future phases)

- Group-definition UI (G1/G2 via `FacetedSearch`) and attribute pickers — Phase 2.
- Stats card, comparison card, violin plots — Phase 3.
- Switching to `data/Base_Canguro_2025.csv` (different schema: `Iden_Codigo` not `Code`,
  may lack `ERN_*`/`V###` columns) — a later data-source swap requiring column remapping.

## Privacy posture (read before building)

The raw export contains direct and quasi identifiers — `@_id`, `Iden_Codigo`, `Code`,
`Iden_FechaParto` (birth date), `CSP_FechaNacimientoMadre` (mother DOB),
`CSP_CiudadProcedencia` (city), `CSP_OtrasObservaciones` (free text), hospital admit/discharge
dates, plus detailed socioeconomic fields.

**De-identification strategy (this phase): slim projection + surrogate id.** The strongest
control here is column reduction: the output keeps ONLY the columns the visualization needs,
in long format, with a surrogate patient id. No dates, locations, free text, parental, or
socioeconomic columns are emitted.

**Honest limitation.** Column reduction + surrogate ids + dropping dates/free-text strongly
reduce re-identification risk but do not guarantee zero risk; rare clinical combinations can
still be unique. This is premature-infant health data. **Publishing the anonymized output is
a data-governance decision for the user and Fundación Canguro (Nathalie Charpak et al.), not
something this pipeline certifies.** The loader emits a uniqueness report to aid that review.

## Architecture overview

```
data/KMC-50k.csv                      raw export (gitignored; extracted from the archive zip)
   │  (Framework build-time data loader)
   ▼
src/data/canguro.csv.js  ──emits──▶  src/data/canguro.csv   (anonymized, long-format, publishable)
   │                       (stderr) ▶  uniqueness report
   ▼
src/index.md  ──FileAttachment("data/canguro.csv")──▶  native TimeWidget + rangeSlider zoom
```

## Component design

### Phase 0 — `src/data/canguro.csv.js` (anonymization + reshape data loader)

A Node data loader (Framework runs it at build, captures stdout as `data/canguro.csv`).

**Responsibility:** read the raw wide CSV, filter, reshape wide→long using the notebook's
`stages` mapping, assign surrogate ids, emit only analytical columns, and print a privacy
report to stderr.

**Input:** the raw export at repo-root `./data/KMC-50k.csv` (gitignored). Framework runs data
loaders with cwd = project root, so the loader reads `./data/KMC-50k.csv`. Path overridable via
env `CANGURO_RAW` (default `./data/KMC-50k.csv`) so the 2025 file can be swapped later.

> Path disambiguation: the RAW input lives in the **repo-root `data/`** directory (already
> present, gitignored). The loader FILE and its OUTPUT live in **`src/data/`** — the loader is
> `src/data/canguro.csv.js` and Framework serves its stdout as `data/canguro.csv` (i.e.
> `src/data/canguro.csv`), which `src/index.md` reads via `FileAttachment("data/canguro.csv")`.
> These two `data/` directories are different; do not conflate them.

**Steps:**
1. Parse the raw CSV (`d3.csvParse` / streaming if needed; 56k rows × 673 cols ≈ tens of MB — in-memory is fine).
2. Filter `dataF`: keep rows with `20 < ERN_Ballard < 50` (the notebook's filter; ERN_Ballard is the Ballard gestational-age score, a clinical metric, not PII).
3. Reshape wide→long with the **verbatim `stages` array** and `transformData` logic ported from notebook sub-module `b205fb52cf643a23@269.js` (`_stages`, `_transformData`). Each (patient, stage-with-variables) yields a row `{ Code, __stageName, __stageId, __time, ERN_Sexo, peso, talla, PC }` where `__time` is either a fixed stage time (40/53/66/79/92) or the value of a time column (`ERN_Ballard`, `gestasal`, `egestasalPC`), and peso/talla/PC come from the stage's mapped wide columns (`ERN_Peso`/`V218`/… etc.). Full stage table is in the notebook source — copy it exactly.
4. Drop rows where `__time` or `peso` is null/empty, and clamp to the analysis window: keep `peso < 15000` and `20 < __time < 93` (the notebook's `selectedStages` filter).
5. **Surrogate id:** build an in-memory map from each distinct raw `Code` → a sequential surrogate (`P000001`, …). Replace `Code` with `id` = surrogate. The map is NOT exported; linkage to the real `Code` is broken.
6. Emit CSV to stdout with header `id,__stageName,__stageId,__time,sex,peso,talla,PC` (sex = `ERN_Sexo`). This matches the shape `src/data/sample-canguro.csv` uses, so Phase 1 mirrors the demo.
7. **Privacy report (stderr):** print distinct patient count, row count, and a k-anonymity-style check on the birth-stage quasi-identifier tuple `(sex, round(ERN_Peso/100)*100, round(ERN_Ballard))` — report how many patients have a tuple shared by fewer than `k=5` patients. Informational, to support the governance review.

**Produces:** `data/canguro.csv` (served by Framework as `data/canguro.csv`), columns
`id, __stageName, __stageId, __time, sex, peso, talla, PC`.

**Reference-curves data:** also vendor the notebook's `curvasv2.json` (the 6.6 KB growth-curve
file from the archive) to `src/data/curvas.json` if the existing one differs; Phase 1 overlays it.

### Phase 1 — `src/index.md` (native chart, replaces the bridge)

**Responsibility:** the main page, natively, with zoom.

Replace the entire bridge body of `src/index.md` with the native pattern proven in
`src/timewidget-demo.md`, keeping the page title and the Contributors section:

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
  x: "__time", y: "peso", id: "id", groupAttr: "sex", renderer: "canvas",
  width: Math.min(width - 40, 900), height: 500,
  xLabel: "Edad gestacional (semanas)", yLabel: "Peso (g)",
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
const weight = Generators.input(weightSlider);
```
```js
tw.ts.setDomains({ x: weeks, y: weight }); // zoom effect cell
```
- Reset button → `weeksSlider.setValue(tw.ts.fullExtent.x)` / `weightSlider.setValue(tw.ts.fullExtent.y)`.
- Layout: CSS grid (vertical weight slider beside chart, horizontal weeks slider below) — same idiom as the demo, each of `tw`/`weeksSlider`/`weightSlider` rendered exactly once.
- Keep the Contributors paragraph.
- A short note on the page that group definition (G1/G2) and the stats/comparison/violin
  panels are coming in later phases.

> Note: the native page reuses the existing `timeWidgetReactive` and `rangeSlider` components
> verbatim — no new component work in this phase. `width` is a Framework built-in.

### Legacy

Leave the repo-root `index.html` (the old bridge) untouched as a fallback until the full
migration (all phases) is verified. The bridge cells removed from `src/index.md` are
recoverable from git history.

## Data flow

```
build:  data/KMC-50k.csv → loader (filter→reshape→surrogate→project) → data/canguro.csv (+ stderr report)
page:   FileAttachment(canguro.csv) → timeWidgetReactive → chart
zoom:   slider drag → Generators.input → tw.ts.setDomains → re-render (selection preserved)
```

## Error handling

- Loader: if `CANGURO_RAW` file is missing, exit non-zero with a clear message naming the
  expected path and the extraction command (build fails loudly rather than emitting empty data).
- Loader: rows with non-numeric/missing `__time` or `peso` are skipped (not errors).
- Loader: if a stage's mapped wide column is absent in the input header, skip that variable
  for all rows and warn once on stderr (supports schema drift toward the 2025 file).
- Page: `data` empty → TimeWidget renders an empty chart; acceptable (the loader failing is
  the real guard).

## Testing strategy

- **Loader pure logic (node:test):** extract the reshape + surrogate + projection into a pure
  function `buildAnonRows(rawRows, stages)` in a sibling module (`src/data/anonymize.js`),
  tested with a tiny synthetic raw fixture: asserts long rows are produced per stage, peso/talla/PC
  mapped from the right wide columns, `__time` resolved (fixed vs column), out-of-window rows
  dropped, surrogate ids stable per patient and not equal to raw `Code`, and no PII columns in
  the output keys. The `.csv.js` loader is a thin wrapper that reads the file and calls this.
- **Privacy check:** a node:test asserting `buildAnonRows` output objects contain ONLY the keys
  `id,__stageName,__stageId,__time,sex,peso,talla,PC` (guards against accidental PII leakage).
- **Build verification:** `npm run build` produces `data/canguro.csv` with the expected header
  and > 0 rows; stderr shows the uniqueness report.
- **Browser (Playwright):** `index.md` renders the TimeWidget on real anonymized data; x and y
  zoom change the axes; reset restores; reference curves overlay; **no `localhost:8080` request**
  and no console errors.

## Sequencing

1. Phase 0: `anonymize.js` (pure) + tests → `canguro.csv.js` loader → extract raw to `data/KMC-50k.csv` → `npm run build` produces `data/canguro.csv` → review uniqueness report.
2. Phase 1: rewrite `src/index.md` natively → browser-verify.
3. Commit the anonymized `data/canguro.csv` only after the user/Fundación accept the privacy review.

## Open decisions deferred to the plan

- Exact `k` for the uniqueness report (default 5).
- Whether to commit `data/canguro.csv` now or keep it build-generated until governance sign-off
  (default: keep it git-generated / not committed until sign-off; `.gitignore` it for now).
