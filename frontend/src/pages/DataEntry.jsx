import { useMemo, useState } from "react";
import { Download, PenLine, Upload } from "lucide-react";
import SearchSelect from "../components/ui/SearchSelect";
import SelectField from "../components/ui/SelectField";
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
      modeLabel: mode === "manual" ? "Single entry" : "File import"
    }),
    [assets.length, indicators.length, mode]
  );

  if (loading) {
    return (
      <PageLoading
        title="Loading data entry"
        description="Preparing indicators, assets, and import targets."
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Data entry</div>
            <h1 className="page-title">Enter results</h1>
            <p className="page-subtitle">
              Record one result or import a file.
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
        <SummaryTile label="Indicators" value={summary.indicators} text="Available for entry" />
        <SummaryTile label="Assets" value={summary.assets} text="Available for linking" />
        <SummaryTile label="Mode" value={summary.modeLabel} text="Choose how you want to submit data" />
      </div>

      <div className="card">
        <div className="card-body">
          <div className="section-intro">
            <div className="section-copy">
              <div className="section-title">Choose a method</div>
              <div className="section-text">
                Use single entry for one update at a time, or import a file for batch submissions.
              </div>
            </div>
          </div>
          <div className="tab-strip" style={{ marginTop: 16 }}>
            <button className={`tab-pill ${mode === "manual" ? "active" : ""}`} onClick={() => setMode("manual")}>
              <PenLine size={14} /> Single Entry
            </button>
            <button className={`tab-pill ${mode === "bulk" ? "active" : ""}`} onClick={() => setMode("bulk")}>
              <Upload size={14} /> File Import
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
      title: "Choose indicator",
      text: selectedIndicator ? `${selectedIndicator.code || "Indicator"} selected` : "Pick the indicator to update",
      state: currentStep > 0 ? "complete" : "current"
    },
    {
      title: "Enter value",
      text: form.actual_value ? `Ready to save ${form.actual_value}` : "Enter the latest reported value",
      state: currentStep > 1 ? "complete" : currentStep === 1 ? "current" : "pending"
    },
    {
      title: "Add note",
      text: form.comment ? "Note added" : "Add an optional note before saving",
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
                <div className="section-title">Enter one result</div>
                <div className="section-text">
                  Update one indicator at a time and save it immediately.
                </div>
              </div>
            </div>

            <WorkflowSteps steps={manualSteps} />

            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="workflow-panel">
                <div className="workflow-panel-header">
                  <div>
                    <div className="workflow-panel-title">1. Indicator</div>
                    <div className="workflow-panel-text">Choose the indicator that should receive this update.</div>
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
                    <div className="workflow-panel-title">2. Value</div>
                    <div className="workflow-panel-text">Record the latest value exactly as reported.</div>
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
                    <div className="workflow-panel-title">3. Note</div>
                    <div className="workflow-panel-text">
                      Add a short note if the source or exception needs to be recorded.
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
          title="Ready to save"
          items={[
            { label: "Indicator selected", value: form.indicator_id ? "Ready" : "Pending", tone: form.indicator_id ? "good" : "muted" },
            { label: "Actual value entered", value: form.actual_value ? "Ready" : "Pending", tone: form.actual_value ? "good" : "muted" },
            { label: "Context note", value: form.comment ? "Attached" : "Optional", tone: form.comment ? "good" : "muted" }
          ]}
          note={
            selectedIndicator
              ? `${selectedIndicator.code || "Indicator"} will receive the next saved value.`
              : "Choose an indicator to begin."
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
  const columnOptions = useMemo(
    () => (parsed?.columns || []).map((column) => ({ value: column, label: column })),
    [parsed]
  );
  const assetOptions = useMemo(
    () => assets.map((asset) => ({ value: asset.id, label: asset.name })),
    [assets]
  );

  const bulkSteps = [
    {
      title: "Upload file",
      text: parsed ? `${fileName || "File"} loaded` : "Attach a CSV or Excel file",
      state: parsed ? "complete" : "current"
    },
    {
      title: "Match columns",
      text: mappingReady ? "Required columns mapped" : "Match name, date, and value",
      state: mappingReady ? "complete" : parsed ? "current" : "pending"
    },
    {
      title: "Review import",
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
                <div className="section-title">Import a file</div>
                <div className="section-text">
                  Upload a file, match the required columns, then review the sample before import.
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
                    <div className="workflow-panel-title">1. File</div>
                    <div className="workflow-panel-text">
                      Choose the spreadsheet that contains the metrics to import.
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
                      <div className="workflow-panel-title">2. Columns</div>
                      <div className="workflow-panel-text">
                        Match the source columns to the required fields.
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Metric Name Column *</label>
                      <SelectField
                        value={mapping.name || ""}
                        onChange={(nextValue) => setMapping((current) => ({ ...current, name: nextValue }))}
                        options={columnOptions}
                        placeholder="Select column"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date Column *</label>
                      <SelectField
                        value={mapping.date || ""}
                        onChange={(nextValue) => setMapping((current) => ({ ...current, date: nextValue }))}
                        options={columnOptions}
                        placeholder="Select column"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Value Column *</label>
                      <SelectField
                        value={mapping.value || ""}
                        onChange={(nextValue) => setMapping((current) => ({ ...current, value: nextValue }))}
                        options={columnOptions}
                        placeholder="Select column"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Source Column</label>
                      <SelectField
                        value={mapping.source || ""}
                        onChange={(nextValue) => setMapping((current) => ({ ...current, source: nextValue }))}
                        options={columnOptions}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Link to Asset</label>
                    <SelectField
                      value={assetId}
                      onChange={setAssetId}
                      options={assetOptions}
                      placeholder="No asset link"
                    />
                  </div>
                </div>
              ) : null}

              {parsed ? (
                <div className="workflow-panel">
                  <div className="workflow-panel-header">
                    <div>
                      <div className="workflow-panel-title">3. Preview</div>
                      <div className="workflow-panel-text">Check the detected rows before importing.</div>
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
          title="Ready to import"
          items={[
            { label: "Source file", value: parsed ? (fileName || "Attached") : "Pending", tone: parsed ? "good" : "muted" },
            { label: "Required mapping", value: mappingReady ? "Ready" : "Pending", tone: mappingReady ? "good" : "muted" },
            { label: "Destination asset", value: selectedAsset?.name || "Not linked", tone: selectedAsset ? "good" : "muted" }
          ]}
          note={
            parsed
              ? `${parsed.rows.length} rows detected${parsed.sheetName ? ` from ${parsed.sheetName}` : ""}.`
              : "Upload a file to unlock mapping and preview."
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
