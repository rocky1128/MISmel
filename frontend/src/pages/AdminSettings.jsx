import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Plus, Settings } from "lucide-react";
import useMELData from "../hooks/useMELData";
import PageHeader from "../components/layout/PageHeader";
import { EmptyPanel, PageLoading } from "../components/ui/PageStates";
import SelectField from "../components/ui/SelectField";

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
      detail: "Needed before results and imports can be saved.",
      actionLabel: "Add Period",
      action: () => setShowPeriod(true)
    },
    {
      title: "Define departments",
      done: departments.length > 0,
      detail: "Departments help keep ownership clear.",
      actionLabel: "Add Department",
      action: () => setShowDept(true)
    },
    {
      title: "Create assets and indicators",
      done: assets.length > 0 && indicators.length > 0,
      detail: "Dashboards and data entry depend on these records.",
      linkLabel: "Open Indicators",
      linkTo: "/indicators"
    },
    {
      title: "Assign user roles",
      done: users.some((user) => user.role && user.role !== "viewer"),
      detail: "Make sure each person has the right access.",
      actionLabel: "Assign Role",
      action: () => setShowRole(true)
    }
  ];
  const completedSetup = setupTasks.filter((task) => task.done).length;

  if (loading) {
    return (
      <PageLoading
        title="Loading settings"
        description="Collecting periods, departments, and user access."
      />
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Manage reporting periods, departments, and user access."
        meta={
          <div className="badge badge-purple">
            <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
            {currentPeriod}
          </div>
        }
      />

      <div className="summary-strip">
        <SummaryTile label="Periods" value={summary.periods} text="Configured reporting windows" />
        <SummaryTile label="Departments" value={summary.departments} text="Available for assignment" />
        <SummaryTile label="Users" value={summary.users} text="Profiles currently visible to admins" />
        <SummaryTile label="Current period" value={summary.activePeriod} text="Active reporting window" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="section-copy">
            <div className="section-title">Setup checklist</div>
            <div className="section-text">
              Use this checklist to move the workspace into daily use.
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
          description="Create and manage reporting windows used across the workspace."
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
            <EmptyPanel title="No periods yet" text="Create a reporting period to enable submissions and tracking." />
          )}
        </SectionCard>

        <SectionCard
          title="Departments"
          description="Define the teams or units used for ownership and user mapping."
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
            <EmptyPanel title="No departments yet" text="Add departments so users and work can be organized clearly." />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="User access"
        description="Assign user roles and link people to the right department."
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
          <EmptyPanel title="No users found" text="User profiles will appear here after sign-in records are created." />
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
  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "draft", label: "Draft" },
    { value: "locked", label: "Locked" }
  ];

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
          <SelectField
            value={form.status}
            onChange={(nextValue) => setForm((current) => ({ ...current, status: nextValue }))}
            options={statusOptions}
          />
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
  const typeOptions = [
    { value: "leadership", label: "Leadership" },
    { value: "support", label: "Support" },
    { value: "technical", label: "Technical" },
    { value: "cross-functional", label: "Cross-functional" }
  ];

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
          <SelectField
            value={form.type}
            onChange={(nextValue) => setForm((current) => ({ ...current, type: nextValue }))}
            options={typeOptions}
          />
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
  const userOptions = users.map((user) => ({ value: user.id, label: user.fullName }));
  const roleOptions = [
    { value: "admin", label: "Admin" },
    { value: "mel_manager", label: "MEL Manager" },
    { value: "department_owner", label: "Department Owner" },
    { value: "contributor", label: "Contributor" },
    { value: "executive_viewer", label: "Executive Viewer" }
  ];
  const departmentOptions = departments.map((department) => ({
    value: department.id,
    label: department.name
  }));

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
            <SelectField
              value={form.user_id}
              onChange={(nextValue) => setForm((current) => ({ ...current, user_id: nextValue }))}
              options={userOptions}
              placeholder="Select user"
              required
              name="user_id"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <SelectField
              value={form.role}
              onChange={(nextValue) => setForm((current) => ({ ...current, role: nextValue }))}
              options={roleOptions}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Department</label>
          <SelectField
            value={form.department_id}
            onChange={(nextValue) => setForm((current) => ({ ...current, department_id: nextValue }))}
            options={departmentOptions}
            placeholder="Select department"
          />
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
