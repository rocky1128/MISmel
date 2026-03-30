import { useMemo, useState } from "react";
import { Download, Film, Upload } from "lucide-react";
import SelectField from "../components/ui/SelectField";
import useMELData from "../hooks/useMELData";
import { parseUploadedFile, validateMapping, transformRows, generateCSVTemplate } from "../lib/uploadParser";
import {
  buildMediaMetricRows,
  createEmptyMediaEntry,
  GENDER_FIELDS,
  AGE_FIELDS,
  getMediaAssetLabel,
  getPercentageGroupTotal,
  MEDIA_CONTEXT_FIELDS,
  MEDIA_METRIC_FIELDS,
  MEDIA_PLATFORM_OPTIONS,
  isMediaAsset,
  validateMediaEntry
} from "../lib/mediaMetrics";
import { EmptyPanel, PageLoading } from "../components/ui/PageStates";

export default function DataEntry() {
  const {
    assets,
    metrics,
    currentPeriod,
    loading,
    submitMediaMetrics,
    addSubmissionLog
  } = useMELData();
  const [mode, setMode] = useState("manual");

  const mediaAssets = useMemo(
    () => assets.filter((asset) => isMediaAsset(asset)),
    [assets]
  );
  const trackedVideos = useMemo(() => {
    const keys = new Set();
    for (const metric of metrics) {
      if (!mediaAssets.some((asset) => asset.id === metric.assetId)) {
        continue;
      }
      const contentKey = metric.contentKey || metric.metadata?.video_id;
      if (contentKey) {
        keys.add(contentKey);
      }
    }
    return keys.size;
  }, [mediaAssets, metrics]);

  const summary = useMemo(
    () => ({
      mediaAssets: mediaAssets.length,
      trackedVideos,
      modeLabel: mode === "manual" ? "Media form" : "Bulk upload"
    }),
    [mediaAssets.length, mode, trackedVideos]
  );

  if (loading) {
    return (
      <PageLoading
        title="Loading media data entry"
        description="Preparing assets, existing media metrics, and import tools."
      />
    );
  }

  if (!mediaAssets.length) {
    return (
      <div className="page-stack">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <div className="page-breadcrumb">Data entry</div>
              <h1 className="page-title">Media submissions</h1>
              <p className="page-subtitle">Capture media performance for Virtual University and Hangout.</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <EmptyPanel
              title="No media assets are configured"
              text="Add Virtual University or Hangout in Settings before collecting media metrics here."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Data entry</div>
            <h1 className="page-title">Media submissions</h1>
            <p className="page-subtitle">
              Capture per-video performance for Virtual University and Hangout.
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
        <SummaryTile label="Media assets" value={summary.mediaAssets} text="Virtual University and Hangout" />
        <SummaryTile label="Videos tracked" value={summary.trackedVideos} text="Unique video IDs already in the system" />
        <SummaryTile label="Mode" value={summary.modeLabel} text="Choose single-form entry or spreadsheet upload" />
      </div>

      <div className="card">
        <div className="card-body">
          <div className="section-intro">
            <div className="section-copy">
              <div className="section-title">Choose a submission method</div>
              <div className="section-text">
                Both options save the same media fields, so the dashboards update from one consistent structure.
              </div>
            </div>
          </div>
          <div className="tab-strip" style={{ marginTop: 16 }}>
            <button className={`tab-pill ${mode === "manual" ? "active" : ""}`} onClick={() => setMode("manual")}>
              <Film size={14} /> Media Form
            </button>
            <button className={`tab-pill ${mode === "bulk" ? "active" : ""}`} onClick={() => setMode("bulk")}>
              <Upload size={14} /> Bulk Upload
            </button>
          </div>
        </div>
      </div>

      {mode === "manual" ? (
        <MediaEntry assets={mediaAssets} onSubmit={submitMediaMetrics} onLog={addSubmissionLog} />
      ) : (
        <BulkUpload assets={mediaAssets} onSubmit={submitMediaMetrics} onLog={addSubmissionLog} />
      )}
    </div>
  );
}

function MediaEntry({ assets, onSubmit, onLog }) {
  const [form, setForm] = useState(createEmptyMediaEntry());
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const assetOptions = useMemo(
    () => assets.map((asset) => ({
      value: asset.id,
      label: getMediaAssetLabel(asset)
    })),
    [assets]
  );
  const readiness = Boolean(
    form.asset_id && form.video_id && form.title_description && form.pub_date && form.snapshot_date && form.platform
  );
  const genderTotal = getPercentageGroupTotal(form, GENDER_FIELDS);
  const ageTotal = getPercentageGroupTotal(form, AGE_FIELDS);

  const steps = [
    {
      title: "Basic info",
      text: readiness ? "Video context is set" : "Choose the asset, video ID, publication date, snapshot date, and platform",
      state: readiness ? "complete" : "current"
    },
    {
      title: "Performance",
      text: hasMetricValues(form, MEDIA_METRIC_FIELDS.slice(0, 8)) ? "Core metrics added" : "Add the raw performance numbers",
      state: hasMetricValues(form, MEDIA_METRIC_FIELDS.slice(0, 8)) ? "complete" : readiness ? "current" : "pending"
    },
    {
      title: "Audience",
      text: hasMetricValues(form, MEDIA_METRIC_FIELDS.slice(8)) ? "Audience breakdown added" : "Add gender and age percentages if available",
      state: hasMetricValues(form, MEDIA_METRIC_FIELDS.slice(8)) ? "complete" : hasMetricValues(form, MEDIA_METRIC_FIELDS.slice(0, 8)) ? "current" : "pending"
    }
  ];

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateMediaEntry(form);
    if (validationErrors.length) {
      setMsg({ type: "error", text: validationErrors[0] });
      return;
    }

    const rows = buildMediaMetricRows(form);
    if (!rows.length) {
      setMsg({ type: "error", text: "Add at least one metric value before saving this video entry." });
      return;
    }

    setBusy(true);
    setMsg(null);
    const response = await onSubmit(rows);

    if (response.success) {
      setMsg({ type: "success", text: `Saved ${rows.length} metric rows for ${form.video_id}.` });
      onLog?.({
        action: "manual_media_entry",
        entityType: "metrics",
        changes: { asset_id: form.asset_id, video_id: form.video_id, rows: rows.length }
      });
      setForm(createEmptyMediaEntry());
    } else {
      setMsg({ type: "error", text: response.error?.message || "Failed to save media metrics." });
    }

    setBusy(false);
  }

  return (
    <div className="split-layout">
      <div className="card">
        <div className="card-body">
          <div className="form-panel">
            <div className="form-panel-head">
              <div className="section-copy">
                <div className="section-kicker">Manual</div>
                <div className="section-title">Submit one video record</div>
                <div className="section-text">
                  Enter the video context once, add the raw metrics you have, and the asset dashboard updates from those values.
                </div>
              </div>
            </div>

            <WorkflowSteps steps={steps} />

            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="workflow-panel">
                <div className="workflow-panel-header">
                  <div>
                    <div className="workflow-panel-title">1. Basic info</div>
                    <div className="workflow-panel-text">Describe the content item that the metrics belong to.</div>
                  </div>
                </div>

                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label className="form-label">Asset *</label>
                    <SelectField
                      value={form.asset_id}
                      onChange={(nextValue) => setForm((current) => ({ ...current, asset_id: nextValue }))}
                      options={assetOptions}
                      placeholder="Select asset"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Video ID *</label>
                    <input
                      className="form-input"
                      value={form.video_id}
                      onChange={(event) => setForm((current) => ({ ...current, video_id: event.target.value }))}
                      placeholder="e.g. VU-021"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pub Date *</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.pub_date}
                      onChange={(event) => setForm((current) => ({ ...current, pub_date: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Title / Description *</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={form.title_description}
                      onChange={(event) => setForm((current) => ({ ...current, title_description: event.target.value }))}
                      placeholder="Title or short description of the video"
                    />
                  </div>
                  <div className="stack">
                    <div className="form-group">
                      <label className="form-label">Snapshot Date *</label>
                      <input
                        className="form-input"
                        type="date"
                        value={form.snapshot_date}
                        onChange={(event) => setForm((current) => ({ ...current, snapshot_date: event.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Platform *</label>
                      <SelectField
                        value={form.platform}
                        onChange={(nextValue) => setForm((current) => ({ ...current, platform: nextValue }))}
                        options={MEDIA_PLATFORM_OPTIONS}
                        placeholder="Select platform"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="workflow-panel">
                <div className="workflow-panel-header">
                  <div>
                    <div className="workflow-panel-title">2. Performance metrics</div>
                    <div className="workflow-panel-text">Enter percentages as whole numbers like 55 for 55%.</div>
                  </div>
                </div>

                <div className="form-row form-row-3">
                  {MEDIA_METRIC_FIELDS.slice(0, 8).map((field) => (
                    <MetricInput key={field.key} field={field} value={form[field.key]} onChange={(nextValue) =>
                      setForm((current) => ({ ...current, [field.key]: nextValue }))
                    } />
                  ))}
                </div>
              </div>

              <div className="workflow-panel">
                <div className="workflow-panel-header">
                  <div>
                    <div className="workflow-panel-title">3. Audience breakdown</div>
                    <div className="workflow-panel-text">Add gender and age percentages whenever the platform provides them.</div>
                  </div>
                </div>

                <div className="form-section-divider">Gender</div>
                <div className="table-detail" style={{ marginTop: -4 }}>Total: {genderTotal}%</div>
                <div className="form-row">
                  {MEDIA_METRIC_FIELDS.slice(8, 10).map((field) => (
                    <MetricInput key={field.key} field={field} value={form[field.key]} onChange={(nextValue) =>
                      setForm((current) => ({ ...current, [field.key]: nextValue }))
                    } />
                  ))}
                </div>

                <div className="form-section-divider">Age brackets</div>
                <div className="table-detail" style={{ marginTop: -4 }}>Total: {ageTotal}%</div>
                <div className="form-row form-row-3">
                  {MEDIA_METRIC_FIELDS.slice(10).map((field) => (
                    <MetricInput key={field.key} field={field} value={form[field.key]} onChange={(nextValue) =>
                      setForm((current) => ({ ...current, [field.key]: nextValue }))
                    } />
                  ))}
                </div>
              </div>

              {msg ? <div className={`callout callout-${msg.type === "success" ? "success" : "error"}`}>{msg.text}</div> : null}

              <div className="workflow-actions">
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving..." : "Save Video Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="stack">
        <WorkflowAside
          title="What this updates"
          items={[
            { label: "Asset", value: assetOptions.find((option) => option.value === form.asset_id)?.label || "Pending", tone: form.asset_id ? "good" : "muted" },
            { label: "Video record", value: form.video_id || "Pending", tone: form.video_id ? "good" : "muted" },
            { label: "Performance metrics", value: countMetricValues(form, MEDIA_METRIC_FIELDS.slice(0, 8)), tone: hasMetricValues(form, MEDIA_METRIC_FIELDS.slice(0, 8)) ? "good" : "muted" },
            { label: "Audience fields", value: countMetricValues(form, MEDIA_METRIC_FIELDS.slice(8)), tone: hasMetricValues(form, MEDIA_METRIC_FIELDS.slice(8)) ? "good" : "muted" }
          ]}
          note="Each save writes structured metric rows that feed the asset dashboards for Virtual University and Hangout."
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

  const assetOptions = useMemo(
    () => assets.map((asset) => ({
      value: asset.id,
      label: getMediaAssetLabel(asset)
    })),
    [assets]
  );
  const columnOptions = useMemo(
    () => (parsed?.columns || []).map((column) => ({ value: column, label: column })),
    [parsed]
  );
  const mappingReady = Boolean(
    assetId &&
    MEDIA_CONTEXT_FIELDS.every((field) => !field.required || mapping[field.key])
  );

  const steps = [
    {
      title: "Upload file",
      text: parsed ? `${fileName || "File"} loaded` : "Attach a spreadsheet with video rows",
      state: parsed ? "complete" : "current"
    },
    {
      title: "Match fields",
      text: mappingReady ? "Required context fields are mapped" : "Match the spreadsheet columns to the media fields",
      state: mappingReady ? "complete" : parsed ? "current" : "pending"
    },
    {
      title: "Import rows",
      text: parsed ? "Preview sample rows and import" : "Import becomes available after upload",
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
    const validationErrors = validateMapping(mapping, assetId);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }

    const { transformed, errors: rowErrors } = transformRows(parsed.rows, mapping, assetId);
    if (rowErrors.length) {
      setErrors(rowErrors);
    }
    if (!transformed.length) {
      return;
    }

    setBusy(true);
    setMsg(null);
    const response = await onSubmit(transformed);

    if (response.success) {
      setMsg({ type: "success", text: `Imported ${transformed.length} metric rows from ${parsed.rows.length} video records.` });
      onLog?.({
        action: "bulk_media_upload",
        entityType: "metrics",
        changes: { asset_id: assetId, rows: transformed.length, file: fileName }
      });
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
    anchor.download = "media_metrics_template.csv";
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
                <div className="section-title">Upload media rows</div>
                <div className="section-text">
                  Use one spreadsheet row per video record. The upload expands each row into the underlying metric entries automatically.
                </div>
              </div>
              <div className="form-panel-actions">
                <button className="btn btn-outline btn-sm" onClick={downloadTemplate} type="button">
                  <Download size={14} /> CSV Template
                </button>
              </div>
            </div>

            <WorkflowSteps steps={steps} />

            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="workflow-panel">
                <div className="workflow-panel-header">
                  <div>
                    <div className="workflow-panel-title">1. File</div>
                    <div className="workflow-panel-text">Choose the spreadsheet that contains the video records.</div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Asset *</label>
                    <SelectField
                      value={assetId}
                      onChange={setAssetId}
                      options={assetOptions}
                      placeholder="Select asset"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">File (CSV / XLSX)</label>
                    <input type="file" accept=".csv,.xlsx,.xls" className="form-input" onChange={handleFile} />
                  </div>
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
                      <div className="workflow-panel-title">2. Column mapping</div>
                      <div className="workflow-panel-text">Match your spreadsheet columns to the media fields below.</div>
                    </div>
                  </div>

                  <div className="form-section-divider">Required context fields</div>
                  <div className="form-row form-row-3">
                    {MEDIA_CONTEXT_FIELDS.map((field) => (
                      <div className="form-group" key={field.key}>
                        <label className="form-label">{field.label}{field.required ? " *" : ""}</label>
                        <SelectField
                          value={mapping[field.key] || ""}
                          onChange={(nextValue) => setMapping((current) => ({ ...current, [field.key]: nextValue }))}
                          options={columnOptions}
                          placeholder="Select column"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="form-section-divider">Performance and audience fields</div>
                  <div className="form-row form-row-3">
                    {MEDIA_METRIC_FIELDS.map((field) => (
                      <div className="form-group" key={field.key}>
                        <label className="form-label">{field.label}</label>
                        <SelectField
                          value={mapping[field.key] || ""}
                          onChange={(nextValue) => setMapping((current) => ({ ...current, [field.key]: nextValue }))}
                          options={columnOptions}
                          placeholder="Skip field"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {parsed ? (
                <div className="workflow-panel">
                  <div className="workflow-panel-header">
                    <div>
                      <div className="workflow-panel-title">3. Preview</div>
                      <div className="workflow-panel-text">Check the first rows before importing them.</div>
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
                    {busy ? "Importing..." : `Import ${parsed.rows.length} Video Rows`}
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>

      <div className="stack">
        <WorkflowAside
          title="Expected spreadsheet shape"
          items={[
            { label: "Context columns", value: "Video, title, pub date, snapshot date, platform", tone: "good" },
            { label: "Performance fields", value: "Views through followers", tone: "good" },
            { label: "Audience fields", value: "Gender and age percentages", tone: "good" }
          ]}
          note="Choose the asset first, then map the spreadsheet columns. Each row becomes a per-video submission."
        />
      </div>
    </div>
  );
}

function MetricInput({ field, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{field.label}</label>
      <input
        className="form-input"
        type="number"
        min="0"
        max={field.kind === "percent" ? "100" : undefined}
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.kind === "percent" ? "0-100" : "Enter value"}
      />
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

function hasMetricValues(form, fields) {
  return fields.some((field) => form[field.key] !== "");
}

function countMetricValues(form, fields) {
  return `${fields.filter((field) => form[field.key] !== "").length} filled`;
}
