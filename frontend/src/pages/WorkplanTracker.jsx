import { useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import useMELData from "../hooks/useMELData";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function WorkplanTracker() {
  const { activities, objectives, loading, createActivity, submitCheckin } = useMELData();
  const [filterStatus, setFilterStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--gray-400)" }}>Loading...</div>;

  const filtered = filterStatus ? activities.filter(a => a.status === filterStatus) : activities;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Planning</div>
            <h1 className="page-title">Workplan Tracker</h1>
            <p className="page-subtitle">Manage activities, track monthly progress, and monitor workplan delivery.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline" onClick={() => { setShowCheckin(!showCheckin); setShowAdd(false); }}>Check-in</button>
            <button className="btn btn-primary" onClick={() => { setShowAdd(!showAdd); setShowCheckin(false); }}><Plus size={14} /> Add Activity</button>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
          <option value="delayed">Delayed</option>
        </select>
        <div className="toolbar-spacer" />
        <span style={{ fontSize: 13, color: "var(--gray-500)" }}>{filtered.length} activities</span>
      </div>

      {showAdd && <ActivityForm objectives={objectives} onSubmit={createActivity} onDone={() => setShowAdd(false)} />}
      {showCheckin && <CheckinForm activities={activities} onSubmit={submitCheckin} onDone={() => setShowCheckin(false)} />}

      <div className="card">
        <div className="card-body flush">
          {filtered.length ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Activity</th><th>Objective</th><th>Weight</th><th>Status</th><th>Progress</th><th>Owner</th><th>Timeline</th></tr></thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500, maxWidth: 280 }}>{a.title}</td>
                      <td><span className="badge badge-purple">{a.objectiveCode}</span></td>
                      <td>{(a.weight * 100).toFixed(0)}%</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="progress-bar" style={{ width: 60 }}><div className="progress-fill purple" style={{ width: `${a.progress}%` }} /></div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{a.progress}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{a.owner}</td>
                      <td style={{ fontSize: 12, color: "var(--gray-500)" }}>
                        {a.startMonth && a.endMonth ? `${MONTHS[a.startMonth]} - ${MONTHS[a.endMonth]} ${a.year || ""}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><ListChecks size={40} className="empty-state-icon" /><div className="empty-state-title">No activities</div><div className="empty-state-text">Create activities to start tracking workplan delivery.</div></div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { completed: "badge-green", in_progress: "badge-amber", overdue: "badge-red", delayed: "badge-red", planned: "badge-gray", not_started: "badge-gray" };
  return <span className={`badge ${map[status] || "badge-gray"}`}><span className="badge-dot" />{(status || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>;
}

function ActivityForm({ objectives, onSubmit, onDone }) {
  const [form, setForm] = useState({ title: "", objective_id: "", weight: "", planned_start_month: "", planned_end_month: "", planned_year: new Date().getFullYear(), status: "planned" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handle(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const res = await onSubmit(form);
    if (res.success) { setMsg({ t: "s", m: "Activity created." }); setForm(f => ({ ...f, title: "", weight: "" })); }
    else setMsg({ t: "e", m: res.error?.message || "Failed." });
    setBusy(false);
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header"><h3 className="card-title">New Activity</h3></div>
      <div className="card-body">
        <form className="form-grid" onSubmit={handle} style={{ maxWidth: 600 }}>
          <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Objective</label><select className="form-select" value={form.objective_id} onChange={e => setForm(f => ({ ...f, objective_id: e.target.value }))} required><option value="">Select</option>{objectives.map(o => <option key={o.id} value={o.id}>{o.code} - {o.title}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Weight (0-1)</label><input className="form-input" type="number" step="0.01" min="0" max="1" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Start Month</label><select className="form-select" value={form.planned_start_month} onChange={e => setForm(f => ({ ...f, planned_start_month: e.target.value }))}><option value="">Select</option>{MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}</select></div>
            <div className="form-group"><label className="form-label">End Month</label><select className="form-select" value={form.planned_end_month} onChange={e => setForm(f => ({ ...f, planned_end_month: e.target.value }))}><option value="">Select</option>{MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}</select></div>
          </div>
          {msg && <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div>}
          <div style={{ display: "flex", gap: 8 }}><button className="btn btn-primary" disabled={busy}>{busy ? "Creating..." : "Create"}</button><button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button></div>
        </form>
      </div>
    </div>
  );
}

function CheckinForm({ activities, onSubmit, onDone }) {
  const [form, setForm] = useState({ activity_id: "", month: new Date().getMonth() + 1, year: new Date().getFullYear(), status: "in_progress", percent_complete: "", summary: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handle(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const res = await onSubmit(form);
    if (res.success) { setMsg({ t: "s", m: "Check-in saved." }); }
    else setMsg({ t: "e", m: res.error?.message || "Failed." });
    setBusy(false);
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header"><h3 className="card-title">Monthly Check-in</h3></div>
      <div className="card-body">
        <form className="form-grid" onSubmit={handle} style={{ maxWidth: 600 }}>
          <div className="form-group"><label className="form-label">Activity</label><select className="form-select" value={form.activity_id} onChange={e => setForm(f => ({ ...f, activity_id: e.target.value }))} required><option value="">Select</option>{activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="delayed">Delayed</option><option value="overdue">Overdue</option></select></div>
            <div className="form-group"><label className="form-label">% Complete</label><input className="form-input" type="number" min="0" max="100" value={form.percent_complete} onChange={e => setForm(f => ({ ...f, percent_complete: e.target.value }))} required /></div>
          </div>
          <div className="form-group"><label className="form-label">Summary</label><textarea className="form-textarea" rows={2} value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Progress update" /></div>
          {msg && <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div>}
          <div style={{ display: "flex", gap: 8 }}><button className="btn btn-success" disabled={busy}>{busy ? "Saving..." : "Save Check-in"}</button><button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button></div>
        </form>
      </div>
    </div>
  );
}
