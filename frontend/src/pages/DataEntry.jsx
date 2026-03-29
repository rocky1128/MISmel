import { useState } from "react";
import { PenLine, Upload, Download } from "lucide-react";
import useMELData from "../hooks/useMELData";
import { parseUploadedFile, validateMapping, transformRows, generateCSVTemplate } from "../lib/uploadParser";

export default function DataEntry() {
  const { indicators, assets, currentPeriod, loading, submitIndicatorValue, submitBulkMetrics, addSubmissionLog } = useMELData();
  const [mode, setMode] = useState("manual");

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--gray-400)" }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Data Collection</div>
            <h1 className="page-title">Data Entry</h1>
            <p className="page-subtitle">Enter indicator values manually or upload CSV/Excel files for bulk metrics ingestion.</p>
          </div>
          <div className="badge badge-purple"><span className="badge-dot" style={{ background: "var(--purple-500)" }} />{currentPeriod}</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab ${mode === "manual" ? "active" : ""}`} onClick={() => setMode("manual")}>
          <PenLine size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Manual Entry
        </button>
        <button className={`tab ${mode === "bulk" ? "active" : ""}`} onClick={() => setMode("bulk")}>
          <Upload size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Bulk Upload
        </button>
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

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await onSubmit(form);
    if (res.success) {
      setMsg({ type: "success", text: "Value recorded successfully." });
      onLog?.({ action: "manual_entry", entityType: "indicator_value", entityId: form.indicator_id, changes: { actual_value: form.actual_value } });
      setForm(d => ({ ...d, actual_value: "", comment: "" }));
    } else {
      setMsg({ type: "error", text: res.error?.message || "Failed." });
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <div className="card-header"><h3 className="card-title">Enter Indicator Value</h3></div>
      <div className="card-body">
        {!indicators.length ? (
          <div className="empty-state"><div className="empty-state-title">No indicators available</div><div className="empty-state-text">Create indicators first in the database.</div></div>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit} style={{ maxWidth: 540 }}>
            <div className="form-group">
              <label className="form-label">Indicator</label>
              <select className="form-select" value={form.indicator_id} onChange={e => setForm(d => ({ ...d, indicator_id: e.target.value }))} required>
                <option value="">Select an indicator</option>
                {indicators.map(i => <option key={i.id} value={i.id}>{i.code} - {i.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Actual Value</label>
                <input className="form-input" type="number" step="any" value={form.actual_value}
                  onChange={e => setForm(d => ({ ...d, actual_value: e.target.value }))} required placeholder="Enter value" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Comment (optional)</label>
              <textarea className="form-textarea" rows={3} value={form.comment}
                onChange={e => setForm(d => ({ ...d, comment: e.target.value }))} placeholder="Context or data source" />
            </div>
            {msg && <div className={`callout callout-${msg.type === "success" ? "success" : "error"}`}>{msg.text}</div>}
            <div><button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : "Save Value"}</button></div>
          </form>
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

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setMsg(null); setErrors([]);
    try {
      const r = await parseUploadedFile(file);
      setParsed(r); setMapping(r.mapping);
    } catch (err) { setMsg({ type: "error", text: err.message }); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const valErrs = validateMapping(mapping);
    if (valErrs.length) { setErrors(valErrs); return; }
    const { transformed, errors: rowErrs } = transformRows(parsed.rows, mapping, assetId || null);
    if (rowErrs.length) setErrors(rowErrs);
    if (!transformed.length) return;
    setBusy(true);
    const res = await onSubmit(transformed);
    if (res.success) {
      setMsg({ type: "success", text: `Imported ${transformed.length} rows.` });
      onLog?.({ action: "bulk_upload", entityType: "metrics", changes: { rows: transformed.length, file: fileName } });
    } else { setMsg({ type: "error", text: res.error?.message || "Upload failed." }); }
    setBusy(false);
  }

  function downloadTemplate() {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mel_metrics_template.csv";
    a.click();
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Upload Metrics File</h3>
          <button className="btn btn-outline btn-sm" onClick={downloadTemplate}><Download size={14} /> CSV Template</button>
        </div>
        <div className="card-body">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">File (CSV / XLSX)</label>
              <input type="file" accept=".csv,.xlsx,.xls" className="form-input" onChange={handleFile} />
            </div>

            {parsed && (
              <>
                <div className="callout callout-info">Detected {parsed.rows.length} rows, {parsed.columns.length} columns from "{parsed.sheetName}"</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Metric Name Column *</label>
                    <select className="form-select" value={mapping.name || ""} onChange={e => setMapping(d => ({ ...d, name: e.target.value }))}>
                      <option value="">Select</option>
                      {parsed.columns.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date Column *</label>
                    <select className="form-select" value={mapping.date || ""} onChange={e => setMapping(d => ({ ...d, date: e.target.value }))}>
                      <option value="">Select</option>
                      {parsed.columns.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Value Column *</label>
                    <select className="form-select" value={mapping.value || ""} onChange={e => setMapping(d => ({ ...d, value: e.target.value }))}>
                      <option value="">Select</option>
                      {parsed.columns.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Source Column</label>
                    <select className="form-select" value={mapping.source || ""} onChange={e => setMapping(d => ({ ...d, source: e.target.value }))}>
                      <option value="">Optional</option>
                      {parsed.columns.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Link to Asset</label>
                  <select className="form-select" value={assetId} onChange={e => setAssetId(e.target.value)}>
                    <option value="">No asset link</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                <div className="card" style={{ maxHeight: 180, overflowY: "auto", fontSize: 12, border: "1px solid var(--gray-200)" }}>
                  <div className="card-body" style={{ padding: 12 }}>
                    <table>
                      <thead><tr>{parsed.columns.map(c => <th key={c} style={{ fontSize: 10 }}>{c}</th>)}</tr></thead>
                      <tbody>
                        {parsed.rows.slice(0, 5).map((r, i) => (
                          <tr key={i}>{parsed.columns.map(c => <td key={c} style={{ fontSize: 11, padding: "6px 8px" }}>{String(r[c] ?? "")}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {errors.length > 0 && (
              <div className="callout callout-warning">
                <strong>Validation Issues:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
                  {errors.length > 8 && <li>...and {errors.length - 8} more</li>}
                </ul>
              </div>
            )}
            {msg && <div className={`callout callout-${msg.type === "success" ? "success" : "error"}`}>{msg.text}</div>}
            {parsed && <div><button className="btn btn-success" disabled={busy}>{busy ? "Importing..." : `Import ${parsed.rows.length} Rows`}</button></div>}
          </form>
        </div>
      </div>
    </div>
  );
}
