import { useMemo, useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import useMELData from "../hooks/useMELData";
import { EmptyPanel, PageLoading } from "../components/ui/PageStates";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function WorkplanTracker() {
  const { activities, objectives, loading, createActivity, submitCheckin } = useMELData();
  const [filterStatus, setFilterStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);

  const filtered = useMemo(
    () => (filterStatus ? activities.filter((activity) => activity.status === filterStatus) : activities),
    [activities, filterStatus]
  );

  const summary = useMemo(
    () => ({
      total: activities.length,
      inProgress: activities.filter((activity) => activity.status === "in_progress").length,
      completed: activities.filter((activity) => activity.status === "completed").length,
      overdue: activities.filter((activity) => activity.status === "overdue").length
    }),
    [activities]
  );

  if (loading) {
    return (
      <PageLoading
        title="Loading workplan tracker"
        description="Gathering activities, objectives, and the latest monthly check-ins."
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Planning</div>
            <h1 className="page-title">Workplan Tracker</h1>
            <p className="page-subtitle">
              Manage activities, record monthly check-ins, and keep delivery timelines visible
              across the full workplan.
            </p>
          </div>
          <div className="page-actions">
            <button
              className="btn btn-outline"
              onClick={() => {
                setShowCheckin(!showCheckin);
                setShowAdd(false);
              }}
            >
              Check-in
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowAdd(!showAdd);
                setShowCheckin(false);
              }}
            >
              <Plus size={14} /> Add Activity
            </button>
          </div>
        </div>
      </div>

      <div className="summary-strip">
        <SummaryTile label="Total Activities" value={summary.total} text="All tracked workplan items" />
        <SummaryTile label="In Progress" value={summary.inProgress} text="Activities currently being executed" />
        <SummaryTile label="Completed" value={summary.completed} text="Finished activities with check-ins" />
        <SummaryTile label="Overdue" value={summary.overdue} text="Items needing immediate follow-up" />
      </div>

      <div className="toolbar">
        <select className="filter-select" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
          <option value="delayed">Delayed</option>
        </select>
        <div className="toolbar-spacer" />
        <span className="toolbar-note">{filtered.length} activities in view</span>
      </div>

      {showAdd ? (
        <ActivityForm objectives={objectives} onSubmit={createActivity} onDone={() => setShowAdd(false)} />
      ) : null}

      {showCheckin ? (
        <CheckinForm activities={activities} onSubmit={submitCheckin} onDone={() => setShowCheckin(false)} />
      ) : null}

      <div className="card">
        <div className="card-header">
          <div className="section-copy">
            <div className="section-title">Activity Register</div>
            <div className="section-text">
              Track ownership, schedule windows, and completion progress in one shared view.
            </div>
          </div>
        </div>
        <div className="card-body flush">
          {filtered.length ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Objective</th>
                    <th>Weight</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Owner</th>
                    <th>Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((activity) => (
                    <tr key={activity.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{activity.title}</div>
                        {activity.description ? <div className="table-detail">{activity.description}</div> : null}
                      </td>
                      <td>
                        <span className="badge badge-purple">{activity.objectiveCode}</span>
                      </td>
                      <td>{(activity.weight * 100).toFixed(0)}%</td>
                      <td><StatusBadge status={activity.status} /></td>
                      <td>
                        <div className="dashboard-value-inline">
                          <div className="progress-bar" style={{ width: 72 }}>
                            <div className="progress-fill purple" style={{ width: `${activity.progress}%` }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{activity.progress}%</span>
                        </div>
                      </td>
                      <td>{activity.owner}</td>
                      <td className="table-detail" style={{ marginTop: 0 }}>
                        {activity.startMonth && activity.endMonth
                          ? `${MONTHS[activity.startMonth]} - ${MONTHS[activity.endMonth]} ${activity.year || ""}`
                          : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel
              icon={ListChecks}
              title="No activities in this view"
              text="Create an activity or loosen the status filter to see tracked workplan items here."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: "badge-green",
    in_progress: "badge-amber",
    overdue: "badge-red",
    delayed: "badge-red",
    planned: "badge-gray",
    not_started: "badge-gray"
  };

  return (
    <span className={`badge ${map[status] || "badge-gray"}`}>
      <span className="badge-dot" />
      {(status || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
    </span>
  );
}

function ActivityForm({ objectives, onSubmit, onDone }) {
  const [form, setForm] = useState({
    title: "",
    objective_id: "",
    weight: "",
    planned_start_month: "",
    planned_end_month: "",
    planned_year: new Date().getFullYear(),
    status: "planned"
  });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handle(event) {
    event.preventDefault();
    setBusy(true);
    setMsg(null);
    const response = await onSubmit(form);
    if (response.success) {
      setMsg({ t: "s", m: "Activity created." });
      setForm((current) => ({ ...current, title: "", weight: "" }));
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
              <div className="section-kicker">Create</div>
              <div className="section-title">New Activity</div>
              <div className="section-text">
                Add a workplan item with timeline and weighting so it appears in the tracking table.
              </div>
            </div>
          </div>

          <form className="form-grid" onSubmit={handle} style={{ maxWidth: 640 }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Objective</label>
                <select
                  className="form-select"
                  value={form.objective_id}
                  onChange={(event) => setForm((current) => ({ ...current, objective_id: event.target.value }))}
                  required
                >
                  <option value="">Select</option>
                  {objectives.map((objective) => (
                    <option key={objective.id} value={objective.id}>
                      {objective.code} - {objective.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Weight (0-1)</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.weight}
                  onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Month</label>
                <select
                  className="form-select"
                  value={form.planned_start_month}
                  onChange={(event) => setForm((current) => ({ ...current, planned_start_month: event.target.value }))}
                >
                  <option value="">Select</option>
                  {MONTHS.slice(1).map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">End Month</label>
                <select
                  className="form-select"
                  value={form.planned_end_month}
                  onChange={(event) => setForm((current) => ({ ...current, planned_end_month: event.target.value }))}
                >
                  <option value="">Select</option>
                  {MONTHS.slice(1).map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {msg ? <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div> : null}
            <div className="form-panel-actions">
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Creating..." : "Create Activity"}
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

function CheckinForm({ activities, onSubmit, onDone }) {
  const [form, setForm] = useState({
    activity_id: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: "in_progress",
    percent_complete: "",
    summary: ""
  });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handle(event) {
    event.preventDefault();
    setBusy(true);
    setMsg(null);
    const response = await onSubmit(form);
    if (response.success) {
      setMsg({ t: "s", m: "Check-in saved." });
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
              <div className="section-kicker">Update</div>
              <div className="section-title">Monthly Check-in</div>
              <div className="section-text">
                Record the latest progress update to keep the dashboard and tracker current.
              </div>
            </div>
          </div>

          <form className="form-grid" onSubmit={handle} style={{ maxWidth: 640 }}>
            <div className="form-group">
              <label className="form-label">Activity</label>
              <select
                className="form-select"
                value={form.activity_id}
                onChange={(event) => setForm((current) => ({ ...current, activity_id: event.target.value }))}
                required
              >
                <option value="">Select</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">% Complete</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max="100"
                  value={form.percent_complete}
                  onChange={(event) => setForm((current) => ({ ...current, percent_complete: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Summary</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                placeholder="Progress update"
              />
            </div>
            {msg ? <div className={`callout callout-${msg.t === "s" ? "success" : "error"}`}>{msg.m}</div> : null}
            <div className="form-panel-actions">
              <button className="btn btn-success" disabled={busy}>
                {busy ? "Saving..." : "Save Check-in"}
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
