import { useState } from "react";
import { Target, Plus, Lock } from "lucide-react";
import useMELData from "../hooks/useMELData";
import { calculatePerformance, getPerformanceStatus, getPerformanceLabel, getBadgeClass } from "../lib/scoreUtils";

export default function IndicatorRegistry() {
  const { indicators, assets, currentPeriod, loading, error, submitIndicatorValue } = useMELData();
  const [filterCat, setFilterCat] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ indicator_id: "", actual_value: "", comment: "" });
  const [formMsg, setFormMsg] = useState(null);

  if (loading) return <Loader />;

  const filtered = indicators.filter(i => {
    if (filterCat && i.kpiCategory !== filterCat) return false;
    if (filterAsset && i.assetId !== filterAsset) return false;
    if (filterStatus) {
      const s = getPerformanceStatus(calculatePerformance(i.actual, i.target));
      if (s !== filterStatus) return false;
    }
    return true;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setFormMsg(null);
    const res = await submitIndicatorValue(formData);
    if (res.success) {
      setFormMsg({ type: "success", text: "Value saved successfully." });
      setFormData(d => ({ ...d, actual_value: "", comment: "" }));
    } else {
      setFormMsg({ type: "error", text: res.error?.message || "Failed to save." });
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Planning</div>
            <h1 className="page-title">Indicator Registry</h1>
            <p className="page-subtitle">Define, track, and manage all institutional KPIs with baseline, target, and performance data.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <PenIcon size={14} /> Enter Value
          </button>
        </div>
      </div>

      <div className="toolbar">
        <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          <option value="institutional">Institutional</option>
          <option value="asset">Asset</option>
          <option value="process">Process</option>
          <option value="outcome">Outcome</option>
        </select>
        <select className="filter-select" value={filterAsset} onChange={e => setFilterAsset(e.target.value)}>
          <option value="">All Assets</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="green">On Track</option>
          <option value="amber">Needs Attention</option>
          <option value="red">At Risk</option>
        </select>
        <div className="toolbar-spacer" />
        <span style={{ fontSize: 13, color: "var(--gray-500)" }}>{filtered.length} indicators</span>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title">Enter Indicator Value</h3></div>
          <div className="card-body">
            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Indicator</label>
                  <select className="form-select" value={formData.indicator_id}
                    onChange={e => setFormData(d => ({ ...d, indicator_id: e.target.value }))} required>
                    <option value="">Select indicator</option>
                    {indicators.map(i => <option key={i.id} value={i.id}>{i.code} - {i.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Actual Value</label>
                  <input className="form-input" type="number" step="any" value={formData.actual_value}
                    onChange={e => setFormData(d => ({ ...d, actual_value: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Comment</label>
                <textarea className="form-textarea" rows={2} value={formData.comment}
                  onChange={e => setFormData(d => ({ ...d, comment: e.target.value }))} placeholder="Optional note" />
              </div>
              {formMsg && <div className={`callout callout-${formMsg.type === "success" ? "success" : "error"}`}>{formMsg.text}</div>}
              <div><button className="btn btn-primary" type="submit">Save Value</button></div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body flush">
          {filtered.length ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Code</th><th>Indicator</th><th>Category</th><th>Frequency</th>
                    <th>Baseline</th><th>Target</th><th>Actual</th><th>Performance</th><th>Status</th><th>Owner</th></tr>
                </thead>
                <tbody>
                  {filtered.map(ind => {
                    const perf = calculatePerformance(ind.actual, ind.target);
                    const status = getPerformanceStatus(perf);
                    return (
                      <tr key={ind.id}>
                        <td style={{ fontWeight: 600, color: "var(--purple-700)" }}>{ind.code}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{ind.name}</div>
                          {ind.assetName && <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 2 }}>{ind.assetName}</div>}
                        </td>
                        <td><span className="badge badge-purple">{cap(ind.kpiCategory)}</span></td>
                        <td>{cap(ind.frequency)}</td>
                        <td>{ind.baseline}</td>
                        <td style={{ fontWeight: 600 }}>{ind.target}</td>
                        <td style={{ fontWeight: 600 }}>{ind.actual ?? "—"}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="progress-bar" style={{ width: 60 }}>
                              <div className={`progress-fill ${status}`} style={{ width: `${Math.min(perf, 100)}%` }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{perf}%</span>
                          </div>
                        </td>
                        <td><span className={`badge ${getBadgeClass(status)}`}><span className="badge-dot" />{getPerformanceLabel(perf)}</span></td>
                        <td style={{ fontSize: 13 }}>{ind.owner}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Target size={40} className="empty-state-icon" />
              <div className="empty-state-title">No indicators found</div>
              <div className="empty-state-text">Create indicators in the database or adjust filters.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PenIcon(props) { return <Plus {...props} />; }
function Loader() {
  return <div style={{ padding: 60, textAlign: "center", color: "var(--gray-400)" }}>Loading indicators...</div>;
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
