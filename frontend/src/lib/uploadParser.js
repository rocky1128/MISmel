import * as XLSX from "xlsx";
import { buildMediaMetricRows, MEDIA_CONTEXT_FIELDS, MEDIA_METRIC_FIELDS, validateMediaEntry } from "./mediaMetrics";

const ALL_MEDIA_FIELDS = [...MEDIA_CONTEXT_FIELDS, ...MEDIA_METRIC_FIELDS];
const FIELD_ALIASES = {
  video_id: ["video_id", "video id", "content_id", "content id"],
  title_description: ["title_description", "title / description", "title", "description", "video_title", "video title"],
  pub_date: ["pub_date", "pub date", "publish_date", "publish date", "publication_date"],
  snapshot_date: ["snapshot_date", "snapshot date", "report_date", "report date", "capture_date", "capture date", "date"],
  platform: ["platform", "channel", "source"],
  views: ["views", "view_count", "view count"],
  unique_reach: ["unique_reach", "unique reach", "reach"],
  watch_time_min: ["watch_time_min", "watch time", "watch time min", "watch_time_minutes"],
  completion_rate: ["completion_rate", "completion rate", "completion %", "completion"],
  engagement_rate: ["engagement_rate", "engagement rate", "engagement %", "engagement"],
  cta_clicks: ["cta_clicks", "cta clicks", "clicks", "cta"],
  shares_saves: ["shares_saves", "shares / saves", "shares", "saves"],
  new_followers: ["new_followers", "new followers", "followers"],
  male_pct: ["male_pct", "male %", "male"],
  female_pct: ["female_pct", "female %", "female"],
  age_15_17_pct: ["15-17", "15_17", "age_15_17_pct", "15-17 %"],
  age_18_24_pct: ["18-24", "18_24", "age_18_24_pct", "18-24 %"],
  age_25_30_pct: ["25-30", "25_30", "age_25_30_pct", "25-30 %"],
  age_31_35_pct: ["31-35", "31_35", "age_31_35_pct", "31-35 %"],
  age_36_plus_pct: ["36+", "36_plus", "age_36_plus_pct", "36+ %", "36 plus"]
};

export function parseUploadedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!rows.length) {
          reject(new Error("File contains no data rows."));
          return;
        }

        const columns = Object.keys(rows[0]);
        resolve({
          rows,
          columns,
          mapping: autoMap(columns),
          sheetName: workbook.SheetNames[0]
        });
      } catch (error) {
        reject(new Error(`Parse error: ${error.message}`));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

export function validateMapping(mapping, assetId) {
  const errors = [];
  for (const field of MEDIA_CONTEXT_FIELDS) {
    if (field.required && !mapping[field.key]) {
      errors.push(`${field.label} column is required.`);
    }
  }

  if (!assetId) {
    errors.push("Choose the asset before importing.");
  }

  return errors;
}

export function transformRows(rows, mapping, assetId) {
  const transformed = [];
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const entry = { asset_id: assetId || "" };

    for (const field of ALL_MEDIA_FIELDS) {
      const mappedColumn = mapping[field.key];
      entry[field.key] = mappedColumn ? row[mappedColumn] : "";
    }

    if (typeof entry.pub_date === "number") {
      entry.pub_date = parseExcelDate(entry.pub_date);
    }

    if (typeof entry.snapshot_date === "number") {
      entry.snapshot_date = parseExcelDate(entry.snapshot_date);
    }

    const validationErrors = validateMediaEntry(entry);
    if (validationErrors.length) {
      errors.push(`Row ${index + 2}: ${validationErrors.join(" ")}`);
      continue;
    }

    const metricRows = buildMediaMetricRows(entry);
    if (!metricRows.length) {
      errors.push(`Row ${index + 2}: No numeric metric values were found.`);
      continue;
    }

    transformed.push(...metricRows);
  }

  return { transformed, errors };
}

export function generateCSVTemplate() {
  const headers = ALL_MEDIA_FIELDS.map((field) => field.key);
  const rows = [
    [
      "VU-021",
      "Leading with Purpose interview clip",
      "2026-03-12",
      "2026-03-20",
      "youtube",
      "8200",
      "6500",
      "1850",
      "55",
      "4.1",
      "210",
      "150",
      "120",
      "43",
      "57",
      "4",
      "46",
      "28",
      "12",
      "10"
    ]
  ];

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

function autoMap(columns) {
  const mapping = {};
  const normalizedColumns = columns.map((column) => ({
    original: column,
    normalized: normalizeColumn(column)
  }));

  for (const field of ALL_MEDIA_FIELDS) {
    const aliases = FIELD_ALIASES[field.key] || [field.key];
    const match = normalizedColumns.find((column) =>
      aliases.some((alias) => column.normalized.includes(normalizeColumn(alias)))
    );

    if (match) {
      mapping[field.key] = match.original;
    }
  }

  return mapping;
}

function normalizeColumn(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[()%]/g, "")
    .replace(/[+]/g, "plus")
    .replace(/[\s/-]+/g, "_");
}

function parseExcelDate(value) {
  const parsed = XLSX.SSF.parse_date_code(value);
  return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
}
