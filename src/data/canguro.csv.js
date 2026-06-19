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
