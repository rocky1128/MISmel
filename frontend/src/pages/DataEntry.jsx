import { useMemo, useState } from "react";
import { Download, PenLine, Upload } from "lucide-react";
import useMELData from "../hooks/useMELData";
import { parseUploadedFile, validateMapping, transformRows, generateCSVTemplate } from "../lib/uploadParser";
import { EmptyPanel, PageLoading } from "../components/ui/PageStates";

export default function DataEntry() {
  const { indicators, assets, currentPeriod, loading, submitIndicatorValue, submitBulkMetrics, addSubmissionLog } = useMELData();
  const [mode, setMode] = useState("manual");

  const summary = useMemo(
    () => ({
      indicators: indicators.length,
      assets: assets.length,
      modeLabel: mode === "manual" ? "Manual capture" : "Bulk ingestion"
    }),
    [assets.length, indicators.length, mode]
  );

  if (loading) {
    return (
      <PageLoading
        title="Loading data entry workspace"
        description="Preparing indicators, assets, and the available upload targets for new submissions."
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Data Collection</div>
            <h1 className="page-title">Data Entry</h1>
            <p className="page-subtitle">
              Capture reporting values manually or ingest bulk metrics files with a consistent mapping flow.
            </p>
          </div>
          <div className="page-actions">
            <div className="badge badge-purple">
              <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
              {currentPeriod}
            </div>
          </div>
        </div>
      </div>

      <div className="summary-strip">
        <SummaryTile label="Indicators Ready" value={summary.indicators} text="KPIs available for manual entry" />
        <SummaryTile label="Assets Ready" value={summary.assets} text="Available asset links for uploaded metrics" />
        <SummaryTile label="Current Mode" value={summary.modeLabel} text="Switch tabs to change the capture workflow" />
      </div>

      <div className="card">
        <div className="card-body">
          <div className="section-intro">
            <div className="section-copy">
              <div className="section-title">Capture Workflow</div>
              <div className="section-text">
                Use manual entry for one-off KPI updates or bulk upload when importing structured media metrics.
              </div>
            </div>
          </div>
          <div className="tabs" style={{ marginTop: 18 }}>
            <button className={`tab ${mode === "manual" ? "active" : ""}`} onClick={() => setMode("manual")}>
              <PenLine size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Manual Entry
            </button>
            <button className={`tab ${mode === "bulk" ? "active" : ""}`} onClick={() => setMode("bulk")}>
              <Upload size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Bulk Upload
            </button>
          </div>
        </div>
      </div>

      {mode === "manual" ? (
        <ManualEntry indicators={indicators} onSubmit={submitIndicatorValue} onLog={addSubmissionLog} />
      ) : (
        <BulkUpload assets={assets} onSubmit={submitBulkMetrics} onLog={addSubmissionLog} />
      )}
    </div>
  );
}

function ManualEntry({ indicators, onSubmit, onLog }) {
  const [form, setForm] = useState({ indicator_id: "", actual_value: "", comment: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMsg(null);
    const response = await onSubmit(form);
    if (response.success) {
      setMsg({ type: "success", text: "Value recorded successfully." });
      onLog?.({
        action: "manual_entry",
        entityType: "indicator_value",
        entityId: form.indicator_id,
        changes: { actual_value: form.actual_value }
      });
      setForm((current) => ({ ...current, actual_value: "", comment: "" }));
    } else {
      setMsg({ type: "error", text: response.error?.message || "Failed." });
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <div className="card-body">
        {!indicators.length ? (
          <EmptyPanel
            title="No indicators available"
            text="Create indicators first so manual data entry has valid reporting targets."
          />
        ) : (
          <div className="form-panel">
            <div className="form-panel-head">
              <div className="section-copy">
                <div className="section-kicker">Manual</div>
                <div className="section-title">Enter Indicator Value</div>
                <div className="section-text">
                  Submit a single KPI update with optional source context or explanation.
                </div>
              </div>
            </div>
            <form className="form-grid" onSubmit={handleSubmit} style={{ maxWidth: 620 }}>
              <div className="form-group">
                <label className="form-label">Indicator</label>
                <select
                  className="form-select"
                  value={form.indicator_id}
                  onChange={(event) => setForm((current) => ({ ...current, indicator_id: event.target.value }))}
                  required
                >
                  <option value="">Select an indicator</option>
                  {indicators.map((indicator) => (
                    <option key={indicator.id} value={indicator.id}>
                      {indicator.code} - {indicator.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Actual Value</label>
                  <input
                    className="form-input"
                    type="number"
                    step="any"
                    value={form.actual_value}
                    onChange={(event) => setForm((current) => ({ ...current, actual_value: event.target.value }))}
                    required
                    placeholder="Enter value"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Comment (optional)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={form.comment}
                  onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
                  placeholder="Context or data source"
                />
              </div>
              {msg ? <div className={`callout callout-${msg.type === "success" ? "success" : "error"}`}>{msg.text}</div> : null}
              <div className="form-panel-actions">
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving..." : "Save Value"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function BulkUpload({ assets, onSubmit, onLog }) {
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [assetId, setAssetId] = useState("");
  const [errors, setErrors] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMsg(null);
    setErrors([]);
    try {
      const result = await parseUploadedFile(file);
      setParsed(result);
      setMapping(result.mapping);
    } catch (error) {
      setMsg({ type: "error", text: error.message });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateMapping(mapping);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    const { transformed, errors: rowErrors } = transformRows(parsed.rows, mapping, assetId || null);
    if (rowErrors.length) {
      setErrors(rowErrors);
    }
    if (!transformed.length) {
      return;
    }
    setBusy(true);
    const response = await onSubmit(transformed);
    if (response.success) {
      setMsg({ type: "success", text: `Imported ${transformed.length} rows.` });
      onLog?.({ action: "bulk_upload", entityType: "metrics", changes: { rows: transformed.length, file: fileName } });
    } else {
      setMsg({ type: "error", text: response.error?.message || "Upload failed." });
    }
    setBusy(false);
  }

  function downloadTemplate() {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: "text/csv" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "mel_metrics_template.csv";
    anchor.click();
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="form-panel">
          <div className="form-panel-head">
            <div className="section-copy">
              <div className="section-kicker">Bulk</div>
              <div className="section-title">Upload Metrics File</div>
              <div className="section-text">
                Map spreadsheet columns once, preview the first few rows, and import the transformed payload.
              </div>
            </div>
            <div className="form-panel-actions">
              <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>
                <Download size={14} /> CSV Template
              </button>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">File (CSV / XLSX)</label>
              <input type="file" accept=".csv,.xlsx,.xls" className="form-input" onChange={handleFile} />
            </div>

            {parsed ? (
              <>
                <div className="callout callout-info">
                  Detected {parsed.rows.length} rows and {parsed.columns.length} columns from "{parsed.sheetName}".
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Metric Name Column *</label>
                    <select className="form-select" value={mapping.name || ""} onChange={(event) => setMapping((current) => ({ ...current, name: event.target.value }))}>
                      <option value="">Select</option>
                      {parsed.columns.map((column) => (
                        <option key={column}>{column}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date Column *</label>
                    <select className="form-select" value={mapping.date || ""} onChange={(event) => setMapping((current) => ({ ...current, date: event.target.value }))}>
                      <option value="">Select</option>
                      {parsed.columns.map((column) => (
                        <option key={column}>{column}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Value Column *</label>
                    <select className="form-select" value={mapping.value || ""} onChange={(event) => setMapping((current) => ({ ...current, value: event.target.value }))}>
                      <option value="">Select</option>
                      {parsed.columns.map((column) => (
                        <option key={column}>{column}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Source Column</label>
                    <select className="form-select" value={mapping.source || ""} onChange={(event) => setMapping((current) => ({ ...current, source: event.target.value }))}>
                      <option value="">Optional</option>
                      {parsed.columns.map((column) => (
                        <option key={column}>{column}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Link to Asset</label>
                  <select className="form-select" value={assetId} onChange={(event) => setAssetId(event.target.value)}>
                    <option value="">No asset link</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="card file-preview-card">
                  <div className="card-body" style={{ padding: 12 }}>
                    <table>
                      <thead>
                        <tr>
                          {parsed.columns.map((column) => (
                            <th key={column} style={{ fontSize: 10 }}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.rows.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            {parsed.columns.map((column) => (
                              <td key={column} style={{ fontSize: 11, padding: "6px 8px" }}>
                                {String(row[column] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            {errors.length > 0 ? (
              <div className="callout callout-warning">
                <strong>Validation Issues:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {errors.slice(0, 8).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {errors.length > 8 ? <li>...and {errors.length - 8} more</li> : null}
                </ul>
              </div>
            ) : null}
            {msg ? <div className={`callout callout-${msg.type === "success" ? "success" : "error"}`}>{msg.text}</div> : null}
            {parsed ? (
              <div className="form-panel-actions">
                <button className="btn btn-success" disabled={busy}>
                  {busy ? "Importing..." : `Import ${parsed.rows.length} Rows`}
                </button>
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, text }) {
  return (
    <div className="summary-tile">
      <div className="summary-tile-label">{label}</div>
      <div className="summary-tile-value">{value}</div>
      <div className="summary-tile-text">{text}</div>
    </div>
  );
}
