import * as XLSX from "xlsx";

export function parseUploadedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!rows.length) { reject(new Error("File contains no data rows.")); return; }
        const columns = Object.keys(rows[0]);
        resolve({ rows, columns, mapping: autoMap(columns), sheetName: wb.SheetNames[0] });
      } catch (err) { reject(new Error(`Parse error: ${err.message}`)); }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

function autoMap(cols) {
  const m = {};
  const lc = cols.map((c) => c.toLowerCase().replace(/[\s_-]+/g, "_"));
  for (let i = 0; i < cols.length; i++) {
    const c = lc[i];
    if (c.includes("metric") || c.includes("name") || c.includes("kpi")) m.name = cols[i];
    else if (c.includes("source") || c.includes("platform")) m.source = cols[i];
    else if (c.includes("date") || c.includes("period") || c.includes("month")) m.date = cols[i];
    else if (c.includes("value") || c.includes("actual") || c.includes("amount")) m.value = cols[i];
  }
  return m;
}

export function validateMapping(mapping) {
  const errors = [];
  if (!mapping.name) errors.push("Metric name column is required.");
  if (!mapping.date) errors.push("Date column is required.");
  if (!mapping.value) errors.push("Value column is required.");
  return errors;
}

export function transformRows(rows, mapping, assetId) {
  const transformed = [], errors = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[mapping.name] || "").toLowerCase().replace(/[\s-]+/g, "_");
    const source = mapping.source ? String(row[mapping.source] || "manual").toLowerCase() : "manual";
    const valueRaw = row[mapping.value];
    const dateRaw = row[mapping.date];
    if (!name) { errors.push(`Row ${i + 2}: Missing metric name.`); continue; }
    const value = Number(valueRaw);
    if (isNaN(value)) { errors.push(`Row ${i + 2}: Invalid value "${valueRaw}".`); continue; }
    let date;
    if (typeof dateRaw === "number") {
      const d = XLSX.SSF.parse_date_code(dateRaw);
      date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    } else {
      const parsed = new Date(dateRaw);
      if (isNaN(parsed.getTime())) { errors.push(`Row ${i + 2}: Invalid date.`); continue; }
      date = parsed.toISOString().split("T")[0];
    }
    transformed.push({ name, source, asset_id: assetId || null, date, value, metadata: {} });
  }
  return { transformed, errors };
}

export function generateCSVTemplate() {
  const h = ["metric_name", "source", "date", "value"];
  const r = [
    ["views", "facebook", "2025-05-01", "8200"],
    ["unique_reach", "facebook", "2025-05-01", "6500"],
    ["watch_time_min", "youtube", "2025-05-01", "2300"],
    ["engagement_rate", "tiktok", "2025-05-01", "5.5"]
  ];
  return [h, ...r].map((x) => x.join(",")).join("\n");
}
