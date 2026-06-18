# Explorador Canguro

Interactive data exploration tool for the [Kangaroo Foundation (Fundación Canguro)](https://www.fundacioncanguro.co/), Colombia.

Visualizes longitudinal health metrics — weight, length, cranial perimeter — for premature infants enrolled in Kangaroo Mother Care (KMC) programs. Designed for clinical researchers to query and compare patient groups across gestational age using direct temporal manipulation.

**Live demo:** https://john-guerra.github.io/exploradorCanguro/

---

## What it does

- **Time-range brushing** — draw windows on the gestational age timeline to filter patients
- **Group comparison** — define two patient groups (e.g., RCIU vs. non-RCIU) and compare their weight trajectories, distribution shapes, and effect sizes side by side
- **Reference curves** — overlay Fenton W-B and WHO/OMS growth standards (±1, ±2, ±3 SD)
- **Violin plots** — distribution comparison across groups at selected time points
- **Attribute explorer** — switch between weight, length, and cranial perimeter without reloading

---

## Getting started

### Prerequisites

- Node.js ≥ 20.8.0
- Patient data file (`canguro.parquet`) — obtained from Fundación Canguro (not included; contains PII)

### Install

```bash
git clone git@github.com:john-guerra/exploradorCanguro.git
cd exploradorCanguro
npm install
```

### Add data

Place `canguro.parquet` in `src/data/` (see [CLAUDE.md](./CLAUDE.md) for extraction instructions from the notebook archive).

### Run

```bash
npm run dev       # development server at http://localhost:3000
npm run build     # build to docs/
npm run deploy    # deploy to GitHub Pages
```

---

## Architecture

Built with [Observable Framework](https://observablehq.com/framework/), with pages in `src/`:

```
src/
├── index.md               # Main explorer
├── usability.md           # Single-curve usability study
├── usability-multiple.md  # Multi-curve KMC explorer
├── components/
│   ├── timeWidget.js      # TimeWidget reactive wrapper
│   ├── violinPlot.js      # Violin plot component
│   └── statsCard.js       # Statistics card
└── data/
    ├── curvas.json        # Fenton/WHO reference curves
    └── canguro.parquet    # Patient dataset (gitignored)
```

Visualization components follow the **Reactive Widget** pattern ([reactivewidgets.org](https://reactivewidgets.org), IEEE VIS 2024): each widget is a self-contained DOM element that dispatches `input` events on selection change, making it composable with Observable's reactive dataflow.

### Key dependencies

| Package | Role |
|---|---|
| [`time-widget`](https://github.com/john-guerra/TimeWidget) | Interactive time-series brush selection |
| [`reactive-widget-helper`](https://www.npmjs.com/package/reactive-widget-helper) | Reactive widget wrapper pattern |
| [`@observablehq/framework`](https://observablehq.com/framework/) | Static site generator with reactive JS |
| [D3 v7](https://d3js.org/) | Low-level visualization primitives |

---

## Collaborators

This research tool is the result of a collaboration between:

- **Universidad Rey Juan Carlos**, Madrid — Iván Velasco, Sofía Bayona, Luis Pastor
- **Fundación Canguro**, Colombia — Nathalie Charpak, José Tiberio Hernández
- **Northeastern University**, Silicon Valley — [John Alexis Guerra Gómez](https://johnguerra.co)

---

## License

ISC — see [LICENSE](./LICENSE)
