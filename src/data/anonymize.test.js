import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAnonRows, OUTPUT_COLUMNS } from "./anonymize.js";

// Two synthetic patients. Birth stage uses time column ERN_Ballard; "Semana 40"
// uses fixed time 40. P2 has an out-of-window weight that must be dropped.
function rawFixture() {
  return [
    {
      Code: "ABC-1", ERN_Sexo: "1", ERN_Ballard: "30", RCIUFenton: "1",
      ERN_Peso: "1500", ERN_Talla: "40", ERN_PC: "28",
      V218: "3000", V219: "50", V220: "35",     // Semana 40 (time 40)
    },
    {
      Code: "ABC-2", ERN_Sexo: "2", ERN_Ballard: "32", RCIUFenton: "0",
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

test("derives coarse grouping attributes (rciu, gaCat) per patient", () => {
  const { rows } = buildAnonRows(rawFixture());
  const p1 = rows.find((r) => r.id === "P000001");
  assert.equal(p1.rciu, "RCIU");      // RCIUFenton "1"
  assert.equal(p1.gaCat, "<32 sem");  // Ballard 30
  const p2 = rows.find((r) => r.id === "P000002");
  assert.equal(p2.rciu, "No RCIU");   // RCIUFenton "0"
  assert.equal(p2.gaCat, "32-36 sem"); // Ballard 32
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
