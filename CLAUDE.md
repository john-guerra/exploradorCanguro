# Explorador Canguro

Research data visualization tool for the Kangaroo Foundation (Fundación Canguro, Colombia).
Tracks premature infant health metrics — weight (peso), length (talla), cranial perimeter (PC) —
over gestational age. Compares patient groups (e.g., RCIU vs. non-RCIU premature infants).

## Architecture

Observable Framework app (`src/` → built to `docs/`).

- **Pages**: `src/index.md` (main explorer), `src/usability.md`, `src/usability-multiple.md`
- **Components**: `src/components/` — each wraps a D3 chart as a `reactive-widget-helper` widget
- **Data**: `src/data/` — parquet via DuckDB, JSON for reference curves
- **Legacy**: `index.html`, `pruebaUsabilidad.html`, `PruebaUsabilidadMultiple.html` — keep until Framework version is verified in production

The current Framework pages (`src/`) use the compiled ObservableHQ notebook (`@john-guerra/explorador-canguro@972`) via the Observable Runtime as a bridge. The goal is to progressively migrate cells into local Framework code.

## Development

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # build to docs/
npm run deploy   # push docs/ to GitHub Pages
```

**TimeWidget** lives at `../TimeWidget` (sibling directory, linked as `file:../TimeWidget` in package.json).
To rebuild TimeWidget after local changes: `cd ../TimeWidget && npm run build`.

## Data

- `src/data/canguro.parquet` — main patient dataset (~21 MB, **gitignored** — obtain from Fundación Canguro)
  - Key columns: `Iden_Codigo` (patient ID), `gestasal` (gestational age weeks), `peso` (weight g),
    `talla` (length mm), `PC` (cranial perimeter mm), `RCIU` (boolean, intrauterine growth restriction)
  - Source: "base total 93-2024 base de obesidad 17" (Fundación Canguro, 1993–2024)
- `src/data/curvas.json` — Fenton W-B and WHO/OMS growth reference curves, -3SD to +3SD (safe to commit)

To extract patient data from the notebook archive:
```bash
mkdir -p src/data
tar -xzf notebooks/timewidget_canguro_2025.tgz --strip-components=1 -C src/data/ \
  'files/3cd27dd75d8b3768c14b89fcd06767722204e30486dcae6ea5c16a26a1fab116f8520ea663516ef2e1cca6e0afdd7e69ac628b4d4201b95366b0b3c0731591b9.bin'
mv src/data/*.bin src/data/canguro.parquet
```

## Reactive Widget Pattern

Each visualization panel follows the `reactive-widget-helper` pattern (reactivewidgets.org, IEEE VIS 2024).
Widgets dispatch `input` events on selection change, making them composable with `view()` in Observable Framework.

```js
import ReactiveWidget from "reactive-widget-helper";
// const rw = ReactiveWidget(domElement, initialValue, { setValue });
// const selected = view(rw); // reactive — updates downstream cells on brush change
```

Components:
- `src/components/timeWidget.js` — wraps `time-widget` as reactive widget
- `src/components/violinPlot.js` — violin plot for group distribution comparison
- `src/components/statsCard.js` — summary statistics display card

## Observable Notebook (source reference)

Original notebook: https://observablehq.com/@john-guerra/explorador-canguro
Compiled bundle: `notebooks/explorador-canguro.tgz` (version @972, read-only)

To migrate cells to Framework: export notebook source from ObservableHQ (··· → Export → Download tarball),
save as `notebooks/explorador-canguro-src.tgz`, then port individual cell JS files to `src/index.md`.

## Deployment

GitHub Pages: https://john-guerra.github.io/exploradorCanguro/
GitHub remote: `git@github.com:john-guerra/exploradorCanguro.git`
Branch: `feat/observable-framework-migration` → merge to `main` when verified

## Collaborators

- Fundación Canguro, Colombia: Nathalie Charpak, José Tiberio Hernández
- Universidad Rey Juan Carlos, Madrid: Iván Velasco, Sofía Bayona, Luis Pastor
- Northeastern University, Silicon Valley: John Alexis Guerra Gómez
