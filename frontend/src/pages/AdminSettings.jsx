import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Plus, Settings } from "lucide-react";
import useMELData from "../hooks/useMELData";
import { EmptyPanel, PageLoading } from "../components/ui/PageStates";

export default function AdminSettings() {
  const { departments, periods, users, assets, indicators, currentPeriod, loading, createDepartment, createReportingPeriod, updateUserRole } = useMELData();
  const [showDept, setShowDept] = useState(false);
  const [showPeriod, setShowPeriod] = useState(false);
  const [showRole, setShowRole] = useState(false);

  const summary = useMemo(
    () => ({
      periods: periods.length,
      departments: departments.length,
      users: users.length,
      assets: assets.length,
      indicators: indicators.length,
      activePeriod: currentPeriod
    }),
    [assets.length, currentPeriod, departments.length, indicators.length, periods.length, users.length]
  );
  const setupTasks = [
    {
      title: "Create an active reporting period",
      done: periods.some((period) => period.status === "open"),
      detail: "Required before manual submissions and uploads can be saved.",
      actionLabel: "Add Period",
      action: () => setShowPeriod(true)
    },
    {
      title: "Define departments",
      done: departments.length > 0,
      detail: "Departments keep ownership and accountability organized.",
      actionLabel: "Add Department",
      action: () => setShowDept(true)
    },
    {
      title: "Create assets and indicators",
      done: assets.length > 0 && indicators.length > 0,
      detail: "Dashboards and data entry become meaningful after these are configured.",
      linkLabel: "Open Indicators",
      linkTo: "/indicators"
    },
    {
      title: "Assign user roles",
      done: users.some((user) => user.role && user.role !== "viewer"),
      detail: "Give contributors and approvers the right permissions before rollout.",
      actionLabel: "Assign Role",
      action: () => setShowRole(true)
    }
  ];
  const completedSetup = setupTasks.filter((task) => task.done).length;

  if (loading) {
    return (
      <PageLoading
        title="Loading admin settings"
        description="Collecting reporting periods, departments, and role assignments."
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">System</div>
            <h1 className="page-title">Admin Settings</h1>
            <p className="page-subtitle">
              Manage the operating structure behind reporting periods, departments, and user access.
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
        <SummaryTile label="Reporting Periods" value={summary.periods} text="Configured reporting windows" />
        <SummaryTile label="Departments" value={summary.departments} text="Org units available for assignment" />
        <SummaryTile label="Users" value={summary.users} text="Profiles currently visible to admins" />
        <SummaryTile label="Open Period" value={summary.activePeriod} text="Current active reporting window" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="section-copy">
            <div className="section-title">Workspace Setup</div>
            <div className="section-text">
              Use this checklist to move the workspace from first-run setup to live reporting.
            </div>
          </div>
          <div className="badge badge-purple">
            <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
            {completedSetup}/{setupTasks.length} complete
          </div>
        </div>
        <div className="card-body">
          <div className="setup-checklist">
            {setupTasks.map((task) => (
              <div key={task.title} className={`setup-task ${task.done ? "done" : ""}`}>
                <div className={`setup-task-status ${task.done ? "done" : "pending"}`}>
                  {task.done ? "Done" : "Next"}
                </div>
                <div className="setup-task-copy">
                  <div className="setup-task-title">{task.title}</div>
                  <div className="setup-task-text">{task.detail}</div>
                </div>
                {task.action ? (
                  <button type="button" className="btn btn-outline btn-sm" onClick={task.action}>
                    {task.actionLabel}
                  </button>
                ) : (
                  <Link to={task.linkTo} className="btn btn-outline btn-sm">
                    {task.linkLabel}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <SectionCard
          title="Reporting Periods"
          description="Open, lock, and draft reporting periods used throughout the workspace."
          actionLabel="Add Period"
          actionIcon={<Plus size={12} />}
          onAction={() => setShowPeriod(!showPeriod)}
        >
          {showPeriod ? <PeriodForm onSubmit={createReportingPeriod} onDone={() => setShowPeriod(false)} /> : null}
          {periods.length ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id}>
                      <td style={{ fontWeight: 700 }}>{period.name}</td>
                      <td>{period.startDate}</td>
                      <td>{period.endDate}</td>
                      <td>
                        <span className={`badge ${period.status === "open" ? "badge-green" : period.status === "locked" ? "badge-amber" : "badge-gray"}`}>
                          <span className="badge-dot" />
                          {cap(period.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No reporting periods yet" text="Create a reporting period to enable submissions and tracking." />
          )}
        </SectionCard>

        <SectionCard
          title="Departments"
          description="Define organizational units for ownership, collaboration, and user mapping."
          actionLabel="Add Department"
          actionIcon={<Plus size={12} />}
          onAction={() => setShowDept(!showDept)}
        >
          {showDept ? <DeptForm onSubmit={createDepartment} onDone={() => setShowDept(false)} /> : null}
          {departments.length ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((department) => (
                    <tr key={department.id}>
                      <td style={{ fontWeight: 700 }}>{department.name}</td>
                      <td><span className="badge badge-gray">{cap(department.type)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No departments yet" text="Add departments so users and activities can be organized properly." />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="User Access"
        description="Assign user roles and attach them to the right department context."
        actionLabel="Assign Role"
        actionIcon={<Settings size={12} />}
        onAction={() => setShowRole(!showRole)}
      >
        {showRole ? (
          <RoleForm users={users} departments={departments} onSubmit={updateUserRole} onDone={() => setShowRole(false)} />
        ) : null}
        {users.length ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 700 }}>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td><span className="badge badge-purple">{cap(user.role)}</span></td>
                    <td>{user.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel title="No users found" text="User profiles will appear here after authentication records are created." />
        )}
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, description, actionLabel, actionIcon, onAction, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="section-copy">
          <div className="section-title">{title}</div>
          <div className="section-text">{description}</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={onAction}>
          {actionIcon} {actionLabel}
        </button>
      </div>
      <div className="card-body flush">{children}</div>
    </div>
  );
}

function PeriodForm({ onSubmit, onDone }) {
  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    status: "open",
    year: new Date().getFullYear()
  });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handle(event) {
    event.preventDefault();
    setBusy(true);
    const response = await onSubmit(form);
    setMsg(response.success ? { t: "s", m: "Period created." } : { t: "e", m: response.error?.message });
    setBusy(false);
  }

  return (
    <div style={{ padding: 20 }}>
      <form className="form-grid" onSubmit={handle} style={{ maxWidth: 420 }}>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
            placeholder="Q2 2026"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start</label>
            <input
              className="form-input"
              type="date"
              value={form.start_date}
              onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">End</label>
            <input
              className="form-input"
              type="date"
              value={form.end_date}
              onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="open">Open</option>
            <option value="draft">Draft</option>
            <option value="locked">Locked</option>
          </select>
        </div>
        {msg ? <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div> : null}
        <div className="form-panel-actions">
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Creating..." : "Create"}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function DeptForm({ onSubmit, onDone }) {
  const [form, setForm] = useState({ name: "", type: "support" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handle(event) {
    event.preventDefault();
    setBusy(true);
    const response = await onSubmit(form);
    setMsg(response.success ? { t: "s", m: "Department added." } : { t: "e", m: response.error?.message });
    setBusy(false);
  }

  return (
    <div style={{ padding: 20 }}>
      <form className="form-grid" onSubmit={handle} style={{ maxWidth: 420 }}>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            className="form-select"
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
          >
            <option value="leadership">Leadership</option>
            <option value="support">Support</option>
            <option value="technical">Technical</option>
            <option value="cross-functional">Cross-functional</option>
          </select>
        </div>
        {msg ? <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div> : null}
        <div className="form-panel-actions">
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Adding..." : "Add"}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function RoleForm({ users, departments, onSubmit, onDone }) {
  const [form, setForm] = useState({ user_id: "", role: "contributor", department_id: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handle(event) {
    event.preventDefault();
    setBusy(true);
    const response = await onSubmit(form);
    setMsg(response.success ? { t: "s", m: "Role updated." } : { t: "e", m: response.error?.message });
    setBusy(false);
  }

  return (
    <div style={{ padding: 20 }}>
      <form className="form-grid" onSubmit={handle} style={{ maxWidth: 520 }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">User</label>
            <select
              className="form-select"
              value={form.user_id}
              onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}
              required
            >
              <option value="">Select</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="admin">Admin</option>
              <option value="mel_manager">MEL Manager</option>
              <option value="department_owner">Department Owner</option>
              <option value="contributor">Contributor</option>
              <option value="executive_viewer">Executive Viewer</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Department</label>
          <select
            className="form-select"
            value={form.department_id}
            onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))}
          >
            <option value="">Select</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        {msg ? <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div> : null}
        <div className="form-panel-actions">
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Updating..." : "Update"}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        </div>
      </form>
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

function cap(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}
