import { useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";
import useMELData from "../hooks/useMELData";
import { calculatePerformance, getBadgeClass, getPerformanceLabel, getPerformanceStatus } from "../lib/scoreUtils";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";

export default function IndicatorRegistry() {
  const { indicators, assets, currentPeriod, loading, error, submitIndicatorValue } = useMELData();
  const [filterCat, setFilterCat] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ indicator_id: "", actual_value: "", comment: "" });
  const [formMsg, setFormMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () =>
      indicators.filter((indicator) => {
        if (filterCat && indicator.kpiCategory !== filterCat) return false;
        if (filterAsset && indicator.assetId !== filterAsset) return false;
        if (filterStatus) {
          const status = getPerformanceStatus(calculatePerformance(indicator.actual, indicator.target));
          if (status !== filterStatus) return false;
        }
        return true;
      }),
    [filterAsset, filterCat, filterStatus, indicators]
  );

  const summary = useMemo(
    () => ({
      total: indicators.length,
      onTrack: indicators.filter((indicator) => calculatePerformance(indicator.actual, indicator.target) >= 90).length,
      attention: indicators.filter((indicator) => {
        const performance = calculatePerformance(indicator.actual, indicator.target);
        return performance >= 60 && performance < 90;
      }).length,
      atRisk: indicators.filter((indicator) => calculatePerformance(indicator.actual, indicator.target) < 60).length
    }),
    [indicators]
  );

  if (loading) {
    return (
      <PageLoading
        title="Loading indicator registry"
        description="Collecting indicator definitions, targets, and the latest submitted values."
      />
    );
  }

  if (error) {
    return (
      <PageError
        title="Indicator registry could not load"
        description="The registry depends on indicator definitions, linked assets, and reporting values."
        message={error}
      />
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormMsg(null);
    const response = await submitIndicatorValue(formData);
    if (response.success) {
      setFormMsg({ type: "success", text: "Value saved successfully." });
      setFormData((current) => ({ ...current, actual_value: "", comment: "" }));
    } else {
      setFormMsg({ type: "error", text: response.error?.message || "Failed to save." });
    }
    setSaving(false);
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Planning</div>
            <h1 className="page-title">Indicator Registry</h1>
            <p className="page-subtitle">
              Keep KPI definitions, targets, ownership, and reporting performance aligned in one registry.
            </p>
          </div>
          <div className="page-actions">
            <div className="badge badge-purple">
              <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
              {currentPeriod}
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <Plus size={14} /> Enter Value
            </button>
          </div>
        </div>
      </div>

      <div className="summary-strip">
        <SummaryTile label="Total Indicators" value={summary.total} text="All configured KPIs" />
        <SummaryTile label="On Track" value={summary.onTrack} text="Performance at or above 90%" />
        <SummaryTile label="Attention" value={summary.attention} text="Indicators in the warning band" />
        <SummaryTile label="At Risk" value={summary.atRisk} text="Indicators below the expected pace" />
      </div>

      <div className="toolbar">
        <select className="filter-select" value={filterCat} onChange={(event) => setFilterCat(event.target.value)}>
          <option value="">All Categories</option>
          <option value="institutional">Institutional</option>
          <option value="asset">Asset</option>
          <option value="process">Process</option>
          <option value="outcome">Outcome</option>
        </select>
        <select className="filter-select" value={filterAsset} onChange={(event) => setFilterAsset(event.target.value)}>
          <option value="">All Assets</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name}
            </option>
          ))}
        </select>
        <select className="filter-select" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
          <option value="">All Statuses</option>
          <option value="green">On Track</option>
          <option value="amber">Needs Attention</option>
          <option value="red">At Risk</option>
        </select>
        <div className="toolbar-spacer" />
        <span className="toolbar-note">{filtered.length} indicators in view</span>
      </div>

      {showForm ? (
        <div className="card">
          <div className="card-body">
            <div className="form-panel">
              <div className="form-panel-head">
                <div className="section-copy">
                  <div className="section-kicker">Capture</div>
                  <div className="section-title">Enter Indicator Value</div>
                  <div className="section-text">
                    Submit the latest actual value for an indicator and attach optional reporting context.
                  </div>
                </div>
              </div>
              <form className="form-grid" onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Indicator</label>
                    <select
                      className="form-select"
                      value={formData.indicator_id}
                      onChange={(event) => setFormData((current) => ({ ...current, indicator_id: event.target.value }))}
                      required
                    >
                      <option value="">Select indicator</option>
                      {indicators.map((indicator) => (
                        <option key={indicator.id} value={indicator.id}>
                          {indicator.code} - {indicator.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Actual Value</label>
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      value={formData.actual_value}
                      onChange={(event) => setFormData((current) => ({ ...current, actual_value: event.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Comment</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={formData.comment}
                    onChange={(event) => setFormData((current) => ({ ...current, comment: event.target.value }))}
                    placeholder="Optional note"
                  />
                </div>
                {formMsg ? (
                  <div className={`callout callout-${formMsg.type === "success" ? "success" : "error"}`}>
                    {formMsg.text}
                  </div>
                ) : null}
                <div className="form-panel-actions">
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Value"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <div className="section-copy">
            <div className="section-title">Indicator Table</div>
            <div className="section-text">
              Review baseline, target, actual, and status details for the current filtered set.
            </div>
          </div>
        </div>
        <div className="card-body flush">
          {filtered.length ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Indicator</th>
                    <th>Category</th>
                    <th>Frequency</th>
                    <th>Baseline</th>
                    <th>Target</th>
                    <th>Actual</th>
                    <th>Performance</th>
                    <th>Status</th>
                    <th>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((indicator) => {
                    const performance = calculatePerformance(indicator.actual, indicator.target);
                    const status = getPerformanceStatus(performance);
                    return (
                      <tr key={indicator.id}>
                        <td style={{ fontWeight: 700, color: "var(--purple-700)" }}>{indicator.code}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{indicator.name}</div>
                          {indicator.assetName ? <div className="table-detail">{indicator.assetName}</div> : null}
                        </td>
                        <td><span className="badge badge-purple">{cap(indicator.kpiCategory)}</span></td>
                        <td>{cap(indicator.frequency)}</td>
                        <td>{formatValue(indicator.baseline)}</td>
                        <td style={{ fontWeight: 700 }}>{formatValue(indicator.target)}</td>
                        <td style={{ fontWeight: 700 }}>{formatValue(indicator.actual)}</td>
                        <td>
                          <div className="dashboard-value-inline">
                            <div className="progress-bar" style={{ width: 72 }}>
                              <div
                                className={`progress-fill ${status}`}
                                style={{ width: `${Math.min(performance, 100)}%` }}
                              />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{performance}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getBadgeClass(status)}`}>
                            <span className="badge-dot" />
                            {getPerformanceLabel(performance)}
                          </span>
                        </td>
                        <td>{indicator.owner}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel
              icon={Target}
              title="No indicators matched this filter"
              text="Adjust the filters or create indicators in the database to populate the registry."
            />
          )}
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

function formatValue(value) {
  return value === null || value === undefined || value === "" ? "--" : value;
}

function cap(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}
