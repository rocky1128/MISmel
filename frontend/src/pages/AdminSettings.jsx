import { useState } from "react";
import { Settings, Plus } from "lucide-react";
import useMELData from "../hooks/useMELData";

export default function AdminSettings() {
  const { departments, periods, users, currentPeriod, loading, createDepartment, createReportingPeriod, updateUserRole } = useMELData();
  const [showDept, setShowDept] = useState(false);
  const [showPeriod, setShowPeriod] = useState(false);
  const [showRole, setShowRole] = useState(false);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--gray-400)" }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">System</div>
            <h1 className="page-title">Admin Settings</h1>
            <p className="page-subtitle">Manage reporting periods, departments, and user role assignments.</p>
          </div>
          <div className="badge badge-purple"><span className="badge-dot" style={{ background: "var(--purple-500)" }} />{currentPeriod}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Periods */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Reporting Periods</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setShowPeriod(!showPeriod)}><Plus size={12} /> Add</button>
          </div>
          <div className="card-body flush">
            {showPeriod && <PeriodForm onSubmit={createReportingPeriod} onDone={() => setShowPeriod(false)} />}
            {periods.length ? (
              <table>
                <thead><tr><th>Name</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
                <tbody>
                  {periods.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ fontSize: 13 }}>{p.startDate}</td>
                      <td style={{ fontSize: 13 }}>{p.endDate}</td>
                      <td><span className={`badge ${p.status === "open" ? "badge-green" : p.status === "locked" ? "badge-amber" : "badge-gray"}`}><span className="badge-dot" />{cap(p.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div style={{ padding: 20, textAlign: "center", color: "var(--gray-400)", fontSize: 13 }}>No periods configured.</div>}
          </div>
        </div>

        {/* Departments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Departments</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setShowDept(!showDept)}><Plus size={12} /> Add</button>
          </div>
          <div className="card-body flush">
            {showDept && <DeptForm onSubmit={createDepartment} onDone={() => setShowDept(false)} />}
            {departments.length ? (
              <table>
                <thead><tr><th>Name</th><th>Type</th></tr></thead>
                <tbody>
                  {departments.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td><span className="badge badge-gray">{cap(d.type)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div style={{ padding: 20, textAlign: "center", color: "var(--gray-400)", fontSize: 13 }}>No departments.</div>}
          </div>
        </div>
      </div>

      {/* Users */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">User Access</h3>
          <button className="btn btn-outline btn-sm" onClick={() => setShowRole(!showRole)}><Settings size={12} /> Assign Role</button>
        </div>
        <div className="card-body flush">
          {showRole && <RoleForm users={users} departments={departments} onSubmit={updateUserRole} onDone={() => setShowRole(false)} />}
          {users.length ? (
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                    <td style={{ fontSize: 13, color: "var(--gray-500)" }}>{u.email}</td>
                    <td><span className="badge badge-purple">{cap(u.role)}</span></td>
                    <td style={{ fontSize: 13 }}>{u.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ padding: 20, textAlign: "center", color: "var(--gray-400)", fontSize: 13 }}>No users found.</div>}
        </div>
      </div>
    </div>
  );
}

function PeriodForm({ onSubmit, onDone }) {
  const [f, setF] = useState({ name: "", start_date: "", end_date: "", status: "open", year: new Date().getFullYear() });
  const [msg, setMsg] = useState(null);
  async function handle(e) { e.preventDefault(); const r = await onSubmit(f); setMsg(r.success ? { t: "s", m: "Period created." } : { t: "e", m: r.error?.message }); }
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <form className="form-grid" onSubmit={handle} style={{ maxWidth: 400 }}>
        <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={f.name} onChange={e => setF(d => ({ ...d, name: e.target.value }))} required placeholder="Q2 2026" /></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Start</label><input className="form-input" type="date" value={f.start_date} onChange={e => setF(d => ({ ...d, start_date: e.target.value }))} required /></div><div className="form-group"><label className="form-label">End</label><input className="form-input" type="date" value={f.end_date} onChange={e => setF(d => ({ ...d, end_date: e.target.value }))} required /></div></div>
        <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={f.status} onChange={e => setF(d => ({ ...d, status: e.target.value }))}><option value="open">Open</option><option value="draft">Draft</option><option value="locked">Locked</option></select></div>
        {msg && <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div>}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><button className="btn btn-primary btn-sm">Create</button><button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button></div>
      </form>
    </div>
  );
}

function DeptForm({ onSubmit, onDone }) {
  const [f, setF] = useState({ name: "", type: "support" });
  const [msg, setMsg] = useState(null);
  async function handle(e) { e.preventDefault(); const r = await onSubmit(f); setMsg(r.success ? { t: "s", m: "Department added." } : { t: "e", m: r.error?.message }); }
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <form className="form-grid" onSubmit={handle} style={{ maxWidth: 400 }}>
        <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={f.name} onChange={e => setF(d => ({ ...d, name: e.target.value }))} required /></div>
        <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={f.type} onChange={e => setF(d => ({ ...d, type: e.target.value }))}><option value="leadership">Leadership</option><option value="support">Support</option><option value="technical">Technical</option><option value="cross-functional">Cross-functional</option></select></div>
        {msg && <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div>}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><button className="btn btn-primary btn-sm">Add</button><button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button></div>
      </form>
    </div>
  );
}

function RoleForm({ users, departments, onSubmit, onDone }) {
  const [f, setF] = useState({ user_id: "", role: "contributor", department_id: "" });
  const [msg, setMsg] = useState(null);
  async function handle(e) { e.preventDefault(); const r = await onSubmit(f); setMsg(r.success ? { t: "s", m: "Role updated." } : { t: "e", m: r.error?.message }); }
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <form className="form-grid" onSubmit={handle} style={{ maxWidth: 500 }}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">User</label><select className="form-select" value={f.user_id} onChange={e => setF(d => ({ ...d, user_id: e.target.value }))} required><option value="">Select</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Role</label><select className="form-select" value={f.role} onChange={e => setF(d => ({ ...d, role: e.target.value }))}><option value="admin">Admin</option><option value="mel_manager">MEL Manager</option><option value="department_owner">Department Owner</option><option value="contributor">Contributor</option><option value="executive_viewer">Executive Viewer</option></select></div>
        </div>
        <div className="form-group"><label className="form-label">Department</label><select className="form-select" value={f.department_id} onChange={e => setF(d => ({ ...d, department_id: e.target.value }))}><option value="">Select</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        {msg && <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div>}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><button className="btn btn-primary btn-sm">Update</button><button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button></div>
      </form>
    </div>
  );
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
