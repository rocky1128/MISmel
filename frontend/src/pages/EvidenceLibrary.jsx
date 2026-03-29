import { useMemo, useState } from "react";
import { FolderCheck, Plus, ExternalLink, Upload } from "lucide-react";
import useMELData from "../hooks/useMELData";
import { EmptyPanel, PageLoading } from "../components/ui/PageStates";

export default function EvidenceLibrary() {
  const { evidence, activities, indicators, loading, addEvidence, addSubmissionLog } = useMELData();
  const [filterType, setFilterType] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(
    () => (filterType ? evidence.filter((item) => item.type === filterType) : evidence),
    [evidence, filterType]
  );
  const types = [...new Set(evidence.map((item) => item.type).filter(Boolean))];

  const summary = useMemo(
    () => ({
      total: evidence.length,
      verified: evidence.filter((item) => item.verificationStatus === "Verified").length,
      pending: evidence.filter((item) => item.verificationStatus === "Pending").length,
      rejected: evidence.filter((item) => item.verificationStatus === "Rejected").length
    }),
    [evidence]
  );

  if (loading) {
    return (
      <PageLoading
        title="Loading evidence library"
        description="Pulling uploaded evidence, linked records, and verification status details."
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Validation</div>
            <h1 className="page-title">Evidence Library</h1>
            <p className="page-subtitle">
              Manage proof documents, links, and uploads that support activity delivery and indicator reporting.
            </p>
          </div>
          <div className="page-actions">
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <Plus size={14} /> Upload Evidence
            </button>
          </div>
        </div>
      </div>

      <div className="summary-strip">
        <SummaryTile label="Evidence Items" value={summary.total} text="All files and links in the library" />
        <SummaryTile label="Verified" value={summary.verified} text="Already approved for reporting use" />
        <SummaryTile label="Pending" value={summary.pending} text="Awaiting verification or review" />
        <SummaryTile label="Rejected" value={summary.rejected} text="Items sent back for correction" />
      </div>

      <div className="toolbar">
        <select className="filter-select" value={filterType} onChange={(event) => setFilterType(event.target.value)}>
          <option value="">All Types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <div className="toolbar-spacer" />
        <span className="toolbar-note">{filtered.length} items in view</span>
      </div>

      {showForm ? (
        <EvidenceForm
          activities={activities}
          indicators={indicators}
          onSubmit={addEvidence}
          onLog={addSubmissionLog}
          onDone={() => setShowForm(false)}
        />
      ) : null}

      <div className="card">
        <div className="card-header">
          <div className="section-copy">
            <div className="section-title">Evidence Register</div>
            <div className="section-text">
              Review what each item is linked to, who submitted it, and whether it has been verified.
            </div>
          </div>
        </div>
        <div className="card-body flush">
          {filtered.length ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Linked To</th>
                    <th>Type</th>
                    <th>Period</th>
                    <th>Submitted By</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        {item.description ? <div className="table-detail">{item.description}</div> : null}
                      </td>
                      <td>{item.linkedTo}</td>
                      <td><span className="badge badge-gray">{item.type}</span></td>
                      <td>{item.period || "--"}</td>
                      <td>{item.submittedBy}</td>
                      <td><VerificationBadge status={item.verificationStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel
              icon={FolderCheck}
              title="No evidence items in this view"
              text="Upload a file or link evidence to an activity or indicator to populate the library."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function VerificationBadge({ status }) {
  const map = { Verified: "badge-green", Pending: "badge-amber", Rejected: "badge-red" };
  return (
    <span className={`badge ${map[status] || "badge-gray"}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

function EvidenceForm({ activities, indicators, onSubmit, onLog, onDone }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    evidence_type: "Document",
    activity_id: "",
    indicator_id: "",
    linkMode: "activity",
    attachMode: "file",
    external_url: ""
  });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handle(event) {
    event.preventDefault();
    setBusy(true);
    setMsg(null);
    const payload = {
      title: form.title,
      description: form.description,
      evidence_type: form.evidence_type
    };
    if (form.linkMode === "activity") payload.activity_id = form.activity_id;
    else payload.indicator_id = form.indicator_id;
    if (form.attachMode === "file" && file) payload.file = file;
    else if (form.attachMode === "link") payload.external_url = form.external_url;
    const response = await onSubmit(payload);
    if (response.success) {
      await onLog?.({
        action: "evidence_upload",
        entityType: "evidence_item",
        changes: {
          title: form.title,
          evidence_type: form.evidence_type,
          linked_to: form.linkMode
        }
      });
      setMsg({ t: "s", m: "Evidence uploaded." });
      setForm((current) => ({
        ...current,
        title: "",
        description: "",
        activity_id: "",
        indicator_id: "",
        external_url: ""
      }));
      setFile(null);
    } else {
      setMsg({ t: "e", m: response.error?.message || "Failed." });
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="form-panel">
          <div className="form-panel-head">
            <div className="section-copy">
              <div className="section-kicker">Upload</div>
              <div className="section-title">New Evidence Item</div>
              <div className="section-text">
                Attach a document, photo, report, or external URL to the activity or indicator it supports.
              </div>
            </div>
          </div>

          <form className="form-grid" onSubmit={handle} style={{ maxWidth: 700 }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Evidence Type</label>
                <select
                  className="form-select"
                  value={form.evidence_type}
                  onChange={(event) => setForm((current) => ({ ...current, evidence_type: event.target.value }))}
                >
                  <option>Document</option>
                  <option>Meeting Note</option>
                  <option>Photo</option>
                  <option>Technical Note</option>
                  <option>Report</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Link To</label>
                <select
                  className="form-select"
                  value={form.linkMode}
                  onChange={(event) => setForm((current) => ({ ...current, linkMode: event.target.value }))}
                >
                  <option value="activity">Activity</option>
                  <option value="indicator">Indicator</option>
                </select>
              </div>
            </div>

            {form.linkMode === "activity" ? (
              <div className="form-group">
                <label className="form-label">Activity</label>
                <select
                  className="form-select"
                  value={form.activity_id}
                  onChange={(event) => setForm((current) => ({ ...current, activity_id: event.target.value }))}
                >
                  <option value="">Select</option>
                  {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Indicator</label>
                <select
                  className="form-select"
                  value={form.indicator_id}
                  onChange={(event) => setForm((current) => ({ ...current, indicator_id: event.target.value }))}
                >
                  <option value="">Select</option>
                  {indicators.map((indicator) => (
                    <option key={indicator.id} value={indicator.id}>
                      {indicator.code} - {indicator.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Attachment</label>
              <div className="tabs" style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  className={`tab ${form.attachMode === "file" ? "active" : ""}`}
                  onClick={() => setForm((current) => ({ ...current, attachMode: "file" }))}
                >
                  <Upload size={12} style={{ marginRight: 6, verticalAlign: -2 }} /> File
                </button>
                <button
                  type="button"
                  className={`tab ${form.attachMode === "link" ? "active" : ""}`}
                  onClick={() => setForm((current) => ({ ...current, attachMode: "link" }))}
                >
                  <ExternalLink size={12} style={{ marginRight: 6, verticalAlign: -2 }} /> URL
                </button>
              </div>
              {form.attachMode === "file" ? (
                <input type="file" className="form-input" onChange={(event) => setFile(event.target.files?.[0])} />
              ) : (
                <input
                  className="form-input"
                  placeholder="https://..."
                  value={form.external_url}
                  onChange={(event) => setForm((current) => ({ ...current, external_url: event.target.value }))}
                />
              )}
            </div>
            {msg ? <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div> : null}
            <div className="form-panel-actions">
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Uploading..." : "Upload"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onDone}>
                Cancel
              </button>
            </div>
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
