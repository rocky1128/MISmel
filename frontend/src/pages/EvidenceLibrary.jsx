import { useState } from "react";
import { FolderCheck, Plus, Upload, ExternalLink } from "lucide-react";
import useMELData from "../hooks/useMELData";

export default function EvidenceLibrary() {
  const { evidence, activities, indicators, loading, addEvidence, addSubmissionLog } = useMELData();
  const [filterType, setFilterType] = useState("");
  const [showForm, setShowForm] = useState(false);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--gray-400)" }}>Loading...</div>;

  const filtered = filterType ? evidence.filter(e => e.type === filterType) : evidence;
  const types = [...new Set(evidence.map(e => e.type).filter(Boolean))];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Validation</div>
            <h1 className="page-title">Evidence Library</h1>
            <p className="page-subtitle">Upload and manage verification-ready evidence linked to activities and indicators.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Upload Evidence</button>
        </div>
      </div>

      <div className="toolbar">
        <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="toolbar-spacer" />
        <span style={{ fontSize: 13, color: "var(--gray-500)" }}>{filtered.length} items</span>
      </div>

      {showForm && (
        <EvidenceForm
          activities={activities}
          indicators={indicators}
          onSubmit={addEvidence}
          onLog={addSubmissionLog}
          onDone={() => setShowForm(false)}
        />
      )}

      <div className="card">
        <div className="card-body flush">
          {filtered.length ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Title</th><th>Linked To</th><th>Type</th><th>Period</th><th>Submitted By</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{e.title}</div>
                        {e.description && <div style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 2 }}>{e.description}</div>}
                      </td>
                      <td style={{ fontSize: 13, maxWidth: 200 }}>{e.linkedTo}</td>
                      <td><span className="badge badge-gray">{e.type}</span></td>
                      <td style={{ fontSize: 13 }}>{e.period}</td>
                      <td style={{ fontSize: 13 }}>{e.submittedBy}</td>
                      <td><VerifBadge status={e.verificationStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><FolderCheck size={40} className="empty-state-icon" /><div className="empty-state-title">No evidence uploaded</div><div className="empty-state-text">Upload evidence to link to your activities and indicators.</div></div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerifBadge({ status }) {
  const map = { Verified: "badge-green", Pending: "badge-amber", Rejected: "badge-red" };
  return <span className={`badge ${map[status] || "badge-gray"}`}><span className="badge-dot" />{status}</span>;
}

function EvidenceForm({ activities, indicators, onSubmit, onLog, onDone }) {
  const [form, setForm] = useState({ title: "", description: "", evidence_type: "Document", activity_id: "", indicator_id: "", linkMode: "activity", attachMode: "file", external_url: "" });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handle(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const payload = { title: form.title, description: form.description, evidence_type: form.evidence_type };
    if (form.linkMode === "activity") payload.activity_id = form.activity_id;
    else payload.indicator_id = form.indicator_id;
    if (form.attachMode === "file" && file) payload.file = file;
    else if (form.attachMode === "link") payload.external_url = form.external_url;
    const res = await onSubmit(payload);
    if (res.success) {
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
      setForm(f => ({ ...f, title: "", description: "", activity_id: "", indicator_id: "", external_url: "" }));
      setFile(null);
    }
    else setMsg({ t: "e", m: res.error?.message || "Failed." });
    setBusy(false);
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header"><h3 className="card-title">Upload Evidence</h3></div>
      <div className="card-body">
        <form className="form-grid" onSubmit={handle} style={{ maxWidth: 600 }}>
          <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Evidence Type</label>
              <select className="form-select" value={form.evidence_type} onChange={e => setForm(f => ({ ...f, evidence_type: e.target.value }))}>
                <option>Document</option><option>Meeting Note</option><option>Photo</option><option>Technical Note</option><option>Report</option><option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Link To</label>
              <select className="form-select" value={form.linkMode} onChange={e => setForm(f => ({ ...f, linkMode: e.target.value }))}>
                <option value="activity">Activity</option><option value="indicator">Indicator</option>
              </select>
            </div>
          </div>
          {form.linkMode === "activity" ? (
            <div className="form-group"><label className="form-label">Activity</label><select className="form-select" value={form.activity_id} onChange={e => setForm(f => ({ ...f, activity_id: e.target.value }))}><option value="">Select</option>{activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
          ) : (
            <div className="form-group"><label className="form-label">Indicator</label><select className="form-select" value={form.indicator_id} onChange={e => setForm(f => ({ ...f, indicator_id: e.target.value }))}><option value="">Select</option>{indicators.map(i => <option key={i.id} value={i.id}>{i.code} - {i.name}</option>)}</select></div>
          )}
          <div className="form-group">
            <label className="form-label">Attachment</label>
            <div className="tabs" style={{ marginBottom: 8 }}>
              <button type="button" className={`tab ${form.attachMode === "file" ? "active" : ""}`} onClick={() => setForm(f => ({ ...f, attachMode: "file" }))}><Upload size={12} /> File</button>
              <button type="button" className={`tab ${form.attachMode === "link" ? "active" : ""}`} onClick={() => setForm(f => ({ ...f, attachMode: "link" }))}><ExternalLink size={12} /> URL</button>
            </div>
            {form.attachMode === "file" ? <input type="file" className="form-input" onChange={e => setFile(e.target.files?.[0])} /> : <input className="form-input" placeholder="https://..." value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} />}
          </div>
          {msg && <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div>}
          <div style={{ display: "flex", gap: 8 }}><button className="btn btn-primary" disabled={busy}>{busy ? "Uploading..." : "Upload"}</button><button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button></div>
        </form>
      </div>
    </div>
  );
}
