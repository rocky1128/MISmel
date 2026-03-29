import {
  AlertTriangle,
  Activity,
  BarChart3,
  Database,
  FileCheck,
  Target,
  TrendingUp
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import useMELData from "../hooks/useMELData";
import {
  calculatePerformance,
  getBadgeClass,
  getPerformanceLabel,
  getPerformanceStatus
} from "../lib/scoreUtils";

const MAX_ROWS = 10;

export default function Dashboard() {
  const {
    dashboard,
    indicators,
    metrics,
    assets,
    currentPeriod,
    loading,
    error
  } = useMELData();

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const topIndicators = indicators.slice(0, MAX_ROWS);
  const statusData = [
    { name: "Completed", value: dashboard.completedActivities, color: "#10B981" },
    { name: "In Progress", value: dashboard.activeActivities, color: "#F59E0B" },
    { name: "Overdue", value: dashboard.overdueActivities, color: "#EF4444" },
    {
      name: "Other",
      value: Math.max(
        0,
        dashboard.totalActivities -
          dashboard.completedActivities -
          dashboard.activeActivities -
          dashboard.overdueActivities
      ),
      color: "#6B7280"
    }
  ].filter((item) => item.value > 0);

  const indicatorPerformance = topIndicators.map((indicator) => ({
    name: indicator.code || truncate(indicator.name, 18),
    performance: calculatePerformance(indicator.actual, indicator.target)
  }));

  const onTrack = indicators.filter(
    (indicator) => calculatePerformance(indicator.actual, indicator.target) >= 90
  ).length;
  const needsAttention = indicators.filter((indicator) => {
    const performance = calculatePerformance(indicator.actual, indicator.target);
    return performance >= 60 && performance < 90;
  }).length;
  const atRisk = indicators.filter(
    (indicator) => calculatePerformance(indicator.actual, indicator.target) < 60
  ).length;

  return (
    <div className="page-stack dashboard-page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Overview</div>
            <h1 className="page-title">Executive Dashboard</h1>
            <p className="page-subtitle">
              Real-time visibility into indicator delivery, activity execution, evidence quality,
              and media assets across the MEL workspace.
            </p>
          </div>

          <div className="dashboard-header-meta">
            <div className="badge badge-purple">
              <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
              {currentPeriod}
            </div>
            <div className="dashboard-mini-stat">
              <span className="dashboard-mini-label">Indicator Coverage</span>
              <div className="dashboard-mini-value">{dashboard.totalIndicators}</div>
            </div>
            <div className="dashboard-mini-stat">
              <span className="dashboard-mini-label">Metrics Loaded</span>
              <div className="dashboard-mini-value">{metrics.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          icon={<Target size={18} />}
          iconClass="purple"
          value={dashboard.totalIndicators}
          label="Total Indicators"
          sub={`${onTrack} indicators on track`}
        />
        <MetricCard
          icon={<Activity size={18} />}
          iconClass="green"
          value={dashboard.totalActivities}
          label="Tracked Activities"
          sub={`${dashboard.activeActivities} currently in progress`}
        />
        <MetricCard
          icon={<AlertTriangle size={18} />}
          iconClass="amber"
          value={dashboard.overdueActivities}
          label="Needs Attention"
          sub="Overdue work requiring follow-up"
        />
        <MetricCard
          icon={<FileCheck size={18} />}
          iconClass="purple"
          value={`${dashboard.evidenceCompleteness}%`}
          label="Evidence Verified"
          sub="Share of evidence already validated"
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Indicator Performance</h3>
              <div className="dashboard-card-caption">Top indicators by current reporting progress</div>
            </div>
            <TrendingUp size={16} style={{ color: "var(--gray-400)" }} />
          </div>
          <div className="card-body">
            {indicatorPerformance.length ? (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={indicatorPerformance} layout="vertical" margin={{ left: 0, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F5" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${value}%`, "Performance"]} />
                    <Bar dataKey="performance" radius={[0, 6, 6, 0]} fill="var(--purple-500)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyInline text="No indicator data is available yet for this reporting period." />
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Activity Status</h3>
              <div className="dashboard-card-caption">Distribution of delivery states across active work</div>
            </div>
            <BarChart3 size={16} style={{ color: "var(--gray-400)" }} />
          </div>
          <div className="card-body">
            {statusData.length ? (
              <div className="dashboard-pie-layout">
                <div className="dashboard-pie-chart">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={78}
                        dataKey="value"
                        paddingAngle={3}
                      >
                        {statusData.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, "Activities"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="dashboard-status-list">
                  {statusData.map((item) => (
                    <div key={item.name} className="dashboard-status-item">
                      <span
                        className="dashboard-status-swatch"
                        style={{ background: item.color }}
                      />
                      <strong>{item.value}</strong>
                      <span style={{ color: "var(--gray-500)" }}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyInline text="No activities have been created yet, so status breakdown is not available." />
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Indicator Status Overview</h3>
            <div className="dashboard-card-caption">
              Performance against target for the most recent tracked indicators
            </div>
          </div>

          <div className="dashboard-badge-row">
            <span className="badge badge-green">
              <span className="badge-dot" /> {onTrack} On Track
            </span>
            <span className="badge badge-amber">
              <span className="badge-dot" /> {needsAttention} Attention
            </span>
            <span className="badge badge-red">
              <span className="badge-dot" /> {atRisk} At Risk
            </span>
          </div>
        </div>

        <div className="card-body flush">
          {topIndicators.length ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Indicator</th>
                    <th>Category</th>
                    <th>Target</th>
                    <th>Actual</th>
                    <th>Performance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topIndicators.map((indicator) => {
                    const performance = calculatePerformance(indicator.actual, indicator.target);
                    const status = getPerformanceStatus(performance);

                    return (
                      <tr key={indicator.id}>
                        <td style={{ fontWeight: 700, color: "var(--purple-700)" }}>{indicator.code}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{indicator.name}</div>
                          {indicator.assetName ? (
                            <div style={{ fontSize: 12, color: "var(--gray-400)" }}>{indicator.assetName}</div>
                          ) : null}
                        </td>
                        <td>
                          <span className="badge badge-purple">{capitalize(indicator.kpiCategory)}</span>
                        </td>
                        <td>{formatValue(indicator.target)}</td>
                        <td style={{ fontWeight: 700 }}>{formatValue(indicator.actual)}</td>
                        <td>
                          <div className="dashboard-value-inline">
                            <div className="progress-bar" style={{ width: 88 }}>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyInline text="Indicators have not been configured yet, so the overview table is empty." />
          )}
        </div>
      </div>

      {assets.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Asset Overview</h3>
              <div className="dashboard-card-caption">
                Linked assets and the volume of supporting metrics attached to them
              </div>
            </div>
            <Database size={16} style={{ color: "var(--gray-400)" }} />
          </div>
          <div className="card-body flush">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Linked Indicators</th>
                    <th>Metrics Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td style={{ fontWeight: 700 }}>{asset.name}</td>
                      <td>
                        <span className="badge badge-gray">{capitalize(asset.type)}</span>
                      </td>
                      <td>{indicators.filter((indicator) => indicator.assetId === asset.id).length}</td>
                      <td>{metrics.filter((metric) => metric.assetId === asset.id).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ icon, iconClass, value, label, sub }) {
  return (
    <div className="card metric-card">
      <div className="metric-card-top">
        <div className={`metric-icon ${iconClass}`}>{icon}</div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      {sub ? <div className="metric-subtext">{sub}</div> : null}
    </div>
  );
}

function EmptyInline({ text }) {
  return (
    <div className="empty-state empty-state-compact">
      <div className="empty-state-title">Nothing to show yet</div>
      <div className="empty-state-text">{text}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="state-panel state-panel-centered">
      <div className="spinner" />
      <h2 className="state-panel-title">Loading dashboard</h2>
      <p className="state-panel-text">
        Pulling indicators, activities, evidence, and media metrics into the executive overview.
      </p>
    </div>
  );
}

function ErrorState({ message }) {
  const looksLikePolicyRecursion = /stack depth|infinite recursion/i.test(message || "");

  return (
    <div className="state-panel">
      <div className="state-panel-row">
        <div className="state-panel-icon-wrap error">
          <AlertTriangle size={28} />
        </div>

        <div className="page-stack" style={{ gap: 10 }}>
          <h2 className="state-panel-title">Dashboard data could not load</h2>
          <p className="state-panel-text">
            {looksLikePolicyRecursion
              ? "The dashboard is hitting a recursive database policy after login, so the page can only render its fallback state."
              : "The dashboard ran into a data-loading error before the analytics panels could render."}
          </p>
          <div className="state-panel-detail">{message || "Unknown error"}</div>
          {looksLikePolicyRecursion ? (
            <p className="state-panel-hint">
              Apply the Supabase migration that makes `current_user_role()` run without re-triggering
              `profiles` row-level security. That breaks the recursion and lets the post-login UI load normally.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function truncate(value, limit) {
  if (!value || value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 3)}...`;
}

function formatValue(value) {
  return value === null || value === undefined || value === "" ? "--" : value;
}
