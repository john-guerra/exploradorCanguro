// Pure reshape + de-identification for the Kangaroo patient export.
// Wide (673-col) rows -> slim long-format rows the chart consumes, with
// surrogate ids and a k-anonymity report. No I/O, no PII columns emitted.

export const OUTPUT_COLUMNS = ["id", "__stageName", "__stageId", "__time", "sex", "rciu", "gaCat", "peso", "talla", "PC"];

// Coarse, low-risk clinical grouping attributes (booleans / wide categoricals with
// large group sizes). RCIU is the project's core comparison (RCIU vs non-RCIU).
function rciuLabel(r) {
  return r.RCIUFenton === "1" ? "RCIU" : r.RCIUFenton === "0" ? "No RCIU" : null;
}
function gaCategory(ballard) {
  if (ballard == null) return null;
  if (ballard < 32) return "<32 sem";
  if (ballard < 37) return "32-36 sem";
  return "≥37 sem";
}

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
        rciu: rciuLabel(r),
        gaCat: gaCategory(num(r.ERN_Ballard)),
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
