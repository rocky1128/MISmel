import { useMemo, useState } from "react";
import { Download, PenLine, Upload } from "lucide-react";
import SearchSelect from "../components/ui/SearchSelect";
import useMELData from "../hooks/useMELData";
import { parseUploadedFile, validateMapping, transformRows, generateCSVTemplate } from "../lib/uploadParser";
import { EmptyPanel, PageLoading } from "../components/ui/PageStates";

export default function DataEntry() {
  const {
    indicators,
    assets,
    currentPeriod,
    loading,
    submitIndicatorValue,
    submitBulkMetrics,
    addSubmissionLog
  } = useMELData();
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
              Capture reporting values manually or ingest bulk metrics files with a guided mapping flow.
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
        <SummaryTile label="Current Mode" value={summary.modeLabel} text="Switch modes to change the capture workflow" />
      </div>

      <div className="card">
        <div className="card-body">
          <div className="section-intro">
            <div className="section-copy">
              <div className="section-title">Capture Workflow</div>
              <div className="section-text">
                Use manual entry for one-off KPI updates or bulk upload for structured media files. Each path is broken
                into clear steps so the operator always knows what comes next.
              </div>
            </div>
          </div>
          <div className="tab-strip" style={{ marginTop: 16 }}>
            <button className={`tab-pill ${mode === "manual" ? "active" : ""}`} onClick={() => setMode("manual")}>
              <PenLine size={14} /> Manual Entry
            </button>
            <button className={`tab-pill ${mode === "bulk" ? "active" : ""}`} onClick={() => setMode("bulk")}>
              <Upload size={14} /> Bulk Upload
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

  const selectedIndicator = useMemo(
    () => indicators.find((indicator) => indicator.id === form.indicator_id),
    [form.indicator_id, indicators]
  );
  const indicatorOptions = useMemo(
    () =>
      indicators.map((indicator) => ({
        value: indicator.id,
        label: `${indicator.code} - ${indicator.name}`,
        searchText: `${indicator.code} ${indicator.name} ${indicator.assetName || ""}`
      })),
    [indicators]
  );

  const currentStep = !form.indicator_id ? 0 : !form.actual_value ? 1 : 2;
  const manualSteps = [
    {
      title: "Select indicator",
      text: selectedIndicator ? `${selectedIndicator.code || "Indicator"} selected` : "Choose the KPI you want to update",
      state: currentStep > 0 ? "complete" : "current"
    },
    {
      title: "Enter actual value",
      text: form.actual_value ? `Ready to save ${form.actual_value}` : "Capture the latest value for the reporting period",
      state: currentStep > 1 ? "complete" : currentStep === 1 ? "current" : "pending"
    },
    {
      title: "Add context and submit",
      text: form.comment ? "Context note attached" : "Optional commentary before submission",
      state: currentStep === 2 ? "current" : "pending"
    }
  ];

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

  if (!indicators.length) {
    return (
      <div className="card">
        <div className="card-body">
          <EmptyPanel
            title="No indicators available"
            text="Create indicators first so manual data entry has valid reporting targets."
            actions={[
              { label: "Manage Indicators", to: "/indicators" },
              { label: "Open Settings", to: "/settings", variant: "secondary" }
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="split-layout">
      <div className="card">
        <div className="card-body">
          <div className="form-panel">
            <div className="form-panel-head">
              <div className="section-copy">
                <div className="section-kicker">Manual</div>
                <div className="section-title">Guided Single Entry</div>
                <div className="section-text">
                  Move through one submission at a time: select the KPI, enter the latest result, then add context if
                  needed.
                </div>
              </div>
            </div>

            <WorkflowSteps steps={manualSteps} />

            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="workflow-panel">
                <div className="workflow-panel-header">
                  <div>
                    <div className="workflow-panel-title">Step 1. Select Indicator</div>
                    <div className="workflow-panel-text">Choose the reporting target that should receive this update.</div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Indicator</label>
                  <SearchSelect
                    value={form.indicator_id}
                    onChange={(nextValue) => setForm((current) => ({ ...current, indicator_id: nextValue }))}
                    options={indicatorOptions}
                    required
                    placeholder="Select an indicator"
                    searchPlaceholder="Search indicators by code or name"
                    emptyText="No indicators matched your search"
                    name="indicator_id"
                  />
                </div>
              </div>

              <div className="workflow-panel">
                <div className="workflow-panel-header">
                  <div>
                    <div className="workflow-panel-title">Step 2. Enter Value</div>
                    <div className="workflow-panel-text">Record the latest actual value exactly as reported.</div>
                  </div>
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
              </div>

              <div className="workflow-panel">
                <div className="workflow-panel-header">
                  <div>
                    <div className="workflow-panel-title">Step 3. Add Context</div>
                    <div className="workflow-panel-text">
                      Attach a short note if the source, interpretation, or exception needs to be recorded.
                    </div>
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
              </div>

              {msg ? <div className={`callout callout-${msg.type === "success" ? "success" : "error"}`}>{msg.text}</div> : null}

              <div className="workflow-actions">
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving..." : "Save Value"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="stack">
        <WorkflowAside
          title="Submission Readiness"
          items={[
            { label: "Indicator selected", value: form.indicator_id ? "Ready" : "Pending", tone: form.indicator_id ? "good" : "muted" },
            { label: "Actual value entered", value: form.actual_value ? "Ready" : "Pending", tone: form.actual_value ? "good" : "muted" },
            { label: "Context note", value: form.comment ? "Attached" : "Optional", tone: form.comment ? "good" : "muted" }
          ]}
          note={
            selectedIndicator
              ? `${selectedIndicator.code || "Indicator"} will receive the next saved value.`
              : "Select an indicator to start the submission."
          }
        />
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

  const mappingReady = Boolean(parsed && mapping.name && mapping.date && mapping.value);
  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === assetId),
    [assetId, assets]
  );

  const bulkSteps = [
    {
      title: "Upload source file",
      text: parsed ? `${fileName || "File"} loaded` : "Attach a CSV or Excel source file",
      state: parsed ? "complete" : "current"
    },
    {
      title: "Map required fields",
      text: mappingReady ? "Required columns mapped" : "Match name, date, and value columns",
      state: mappingReady ? "complete" : parsed ? "current" : "pending"
    },
    {
      title: "Review and import",
      text: parsed ? "Preview sample rows and confirm destination" : "Import becomes available after upload",
      state: parsed && mappingReady ? "current" : "pending"
    }
  ];

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
      setParsed(null);
      setMapping({});
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
    <div className="split-layout">
      <div className="card">
        <div className="card-body">
          <div className="form-panel">
            <div className="form-panel-head">
              <div className="section-copy">
                <div className="section-kicker">Bulk</div>
                <div className="section-title">Guided Bulk Upload</div>
                <div className="section-text">
                  Upload a source file, map the required fields once, then review a sample before import.
                </div>
              </div>
              <div className="form-panel-actions">
                <button className="btn btn-outline btn-sm" onClick={downloadTemplate} type="button">
                  <Download size={14} /> CSV Template
                </button>
              </div>
            </div>

            <WorkflowSteps steps={bulkSteps} />

            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="workflow-panel">
                <div className="workflow-panel-header">
                  <div>
                    <div className="workflow-panel-title">Step 1. Upload File</div>
                    <div className="workflow-panel-text">
                      Choose the spreadsheet that contains the metrics to ingest.
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">File (CSV / XLSX)</label>
                  <input type="file" accept=".csv,.xlsx,.xls" className="form-input" onChange={handleFile} />
                </div>
                {parsed ? (
                  <div className="callout callout-info">
                    Detected {parsed.rows.length} rows and {parsed.columns.length} columns from "{parsed.sheetName}".
                  </div>
                ) : null}
              </div>

              {parsed ? (
                <div className="workflow-panel">
                  <div className="workflow-panel-header">
                    <div>
                      <div className="workflow-panel-title">Step 2. Map Required Columns</div>
                      <div className="workflow-panel-text">
                        Match the source columns to the required MEL upload fields.
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Metric Name Column *</label>
                      <select
                        className="form-select"
                        value={mapping.name || ""}
                        onChange={(event) => setMapping((current) => ({ ...current, name: event.target.value }))}
                      >
                        <option value="">Select</option>
                        {parsed.columns.map((column) => (
                          <option key={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date Column *</label>
                      <select
                        className="form-select"
                        value={mapping.date || ""}
                        onChange={(event) => setMapping((current) => ({ ...current, date: event.target.value }))}
                      >
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
                      <select
                        className="form-select"
                        value={mapping.value || ""}
                        onChange={(event) => setMapping((current) => ({ ...current, value: event.target.value }))}
                      >
                        <option value="">Select</option>
                        {parsed.columns.map((column) => (
                          <option key={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Source Column</label>
                      <select
                        className="form-select"
                        value={mapping.source || ""}
                        onChange={(event) => setMapping((current) => ({ ...current, source: event.target.value }))}
                      >
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
                </div>
              ) : null}

              {parsed ? (
                <div className="workflow-panel">
                  <div className="workflow-panel-header">
                    <div>
                      <div className="workflow-panel-title">Step 3. Review Sample</div>
                      <div className="workflow-panel-text">
                        Check the detected rows before committing the import.
                      </div>
                    </div>
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
                </div>
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
                <div className="workflow-actions">
                  <button className="btn btn-success" disabled={busy || !mappingReady}>
                    {busy ? "Importing..." : `Import ${parsed.rows.length} Rows`}
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>

      <div className="stack">
        <WorkflowAside
          title="Import Readiness"
          items={[
            { label: "Source file", value: parsed ? (fileName || "Attached") : "Pending", tone: parsed ? "good" : "muted" },
            { label: "Required mapping", value: mappingReady ? "Ready" : "Pending", tone: mappingReady ? "good" : "muted" },
            { label: "Destination asset", value: selectedAsset?.name || "Not linked", tone: selectedAsset ? "good" : "muted" }
          ]}
          note={
            parsed
              ? `${parsed.rows.length} rows detected${parsed.sheetName ? ` from ${parsed.sheetName}` : ""}.`
              : "Upload a source file to unlock mapping and preview."
          }
        />
      </div>
    </div>
  );
}

function WorkflowSteps({ steps }) {
  return (
    <div className="workflow-steps">
      {steps.map((step, index) => (
        <div key={step.title} className={`workflow-step ${step.state}`}>
          <div className="workflow-step-index">{index + 1}</div>
          <div>
            <div className="workflow-step-title">{step.title}</div>
            <div className="workflow-step-text">{step.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkflowAside({ title, items, note }) {
  return (
    <div className="workflow-aside">
      <div className="workflow-aside-title">{title}</div>
      <div className="workflow-stat-list">
        {items.map((item) => (
          <div key={item.label} className="workflow-stat">
            <span className="workflow-stat-label">{item.label}</span>
            <span className={`workflow-stat-value ${item.tone || "muted"}`}>{item.value}</span>
          </div>
        ))}
      </div>
      {note ? <div className="workflow-note">{note}</div> : null}
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
