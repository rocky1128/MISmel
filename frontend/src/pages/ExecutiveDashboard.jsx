import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useDashboardData from "../hooks/useDashboardData";
import PageHeader from "../components/layout/PageHeader";
import KPICard from "../components/ui/KPICard";
import SectionContainer from "../components/ui/SectionContainer";
import ProgressCard from "../components/ui/ProgressCard";
import AlertCard from "../components/ui/AlertCard";
import InsightCard from "../components/ui/InsightCard";
import ChartCard from "../components/ui/ChartCard";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";
import { MEL_DOMAINS } from "../lib/indicatorEngine";

export default function ExecutiveDashboard() {
  const {
    loading, error, currentPeriod,
    signalBlocks, domainSummary,
    executiveKpis, pillars, alerts, insights,
    computedResults, metrics, indicators, activities, evidence
  } = useDashboardData();

  if (loading) {
    return (
      <PageLoading
        title="Loading executive dashboard"
        description="Building the strategic snapshot, signal blocks, and decision-support insights."
      />
    );
  }

  if (error) {
    return (
      <PageError
        title="Executive dashboard could not load"
        description="The strategic overview depends on indicators, activities, assets, and evidence."
        message={error}
      />
    );
  }

  const hasGovernedData = computedResults.length > 0;
  const hasLegacyDashboardData = metrics.length > 0 || indicators.length > 0 || activities.length > 0 || evidence.length > 0;
  const sb = signalBlocks;

  if (!hasGovernedData && !hasLegacyDashboardData) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Executive Dashboard"
          title="Decision Support Overview"
          description="Strategic signal blocks, domain performance, and actionable insights for leadership decision-making."
          meta={
            <div className="badge badge-purple">
              <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
              {currentPeriod}
            </div>
          }
        />
        <div className="card">
          <EmptyPanel
            title="No dashboard data yet"
            text="Create assets, indicators, and reporting activity to populate the executive dashboards and charts."
            actions={[
              { label: "Open Settings", to: "/settings" },
              { label: "Manage Indicators", to: "/indicators", variant: "secondary" }
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Executive Dashboard"
        title="Decision Support Overview"
        description="Strategic signal blocks, domain performance, and actionable insights for leadership decision-making."
        meta={
          <div className="badge badge-purple">
            <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
            {currentPeriod}
          </div>
        }
      />

      {/* ===== 4 SIGNAL BLOCKS ===== */}
      {hasGovernedData ? (
        <>
          <div className="signal-grid">
            <SignalBlock
              label="Scale"
              icon="scale"
              performance={sb.scale.performance}
              status={sb.scale.status}
              trend={sb.scale.trend}
              subMetrics={sb.scale.subMetrics}
              indicatorCount={sb.scale.indicatorCount}
            />
            <SignalBlock
              label="Engagement"
              icon="engagement"
              performance={sb.engagement.performance}
              status={sb.engagement.status}
              trend={sb.engagement.trend}
              subMetrics={sb.engagement.subMetrics}
              indicatorCount={sb.engagement.indicatorCount}
            />
            <SignalBlock
              label="Learning"
              icon="learning"
              performance={sb.learning.performance}
              status={sb.learning.status}
              trend={sb.learning.trend}
              subMetrics={sb.learning.subMetrics}
              indicatorCount={sb.learning.indicatorCount}
            />
            <SignalBlock
              label="Outcomes"
              icon="outcomes"
              performance={sb.outcomes.performance}
              status={sb.outcomes.status}
              trend={sb.outcomes.trend}
              subMetrics={sb.outcomes.subMetrics}
              indicatorCount={sb.outcomes.indicatorCount}
            />
          </div>

          {/* ===== DATA CONFIDENCE INDICATOR ===== */}
          <DataConfidenceBar confidence={sb.dataConfidence} />

          {/* ===== DOMAIN PERFORMANCE ===== */}
          <SectionContainer
            title="Performance by MEL Domain"
            description="Each domain aggregates governed indicators with weighted scoring across the five MEL framework areas."
          >
            {hasPillarData ? (
              <div className="two-column-grid">
              <div className="progress-grid">
                {domainSummary.map((domain) => (
                  <ProgressCard
                    key={domain.key}
                    title={domain.label}
                    score={domain.performance}
                    trend={domain.trend}
                    tone={mapTone(domain.status)}
                    meta={`${domain.indicatorCount} indicators · ${domain.dataCompleteness}% data`}
                  />
                ))}
              </div>
              <ChartCard
                title="Domain Balance"
                description="Domain comparison reveals where the MEL framework is strongest and where intervention is needed."
                footer="Lower-scoring domains should drive data collection priorities and program design review."
              >
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={domainSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value) => [`${value}%`, "Performance"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                      />
                      <Bar
                        dataKey="performance"
                        radius={[6, 6, 0, 0]}
                        fill="var(--purple-500)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
              </div>
            ) : (
              <div className="card">
                <EmptyPanel
                  title="No strategic chart data yet"
                  text="The pillar graphs will appear once indicators or activities are added to the system."
                />
              </div>
            )}
          </SectionContainer>

          {/* ===== ENGINE RESULTS TABLE ===== */}
          <SectionContainer
            title="Indicator Results"
            description="Live computed results from the indicator engine across all active governed indicators."
          >
            <div className="card">
              <div className="card-body flush">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Indicator</th>
                        <th>Domain</th>
                        <th>Value</th>
                        <th>Target</th>
                        <th>Performance</th>
                        <th>Status</th>
                        <th>Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computedResults.slice(0, 20).map((r) => (
                        <tr key={r.indicator_id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.indicator_name}</div>
                            {r.indicator_code && <div className="table-detail">{r.indicator_code}</div>}
                          </td>
                          <td>
                            <span className="badge badge-purple">
                              {MEL_DOMAINS.find((d) => d.key === r.domain)?.label || r.domain}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{r.value !== null ? r.value : "--"}</td>
                          <td>{r.target}</td>
                          <td>
                            <div className="dashboard-value-inline">
                              <div className="progress-bar" style={{ width: 72 }}>
                                <div
                                  className={`progress-fill ${r.status}`}
                                  style={{ width: `${Math.min(r.performance || 0, 100)}%` }}
                                />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700 }}>
                                {r.performance !== null ? `${r.performance}%` : "--"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${r.status === "good" ? "green" : r.status === "warning" ? "amber" : "red"}`}>
                              <span className="badge-dot" />
                              {r.status === "good" ? "On Track" : r.status === "warning" ? "Warning" : "Critical"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: r.data_coverage >= 80 ? "var(--green-600)" : r.data_coverage >= 50 ? "var(--amber-500)" : "var(--red-500)" }}>
                              {r.data_coverage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </SectionContainer>
        </>
      ) : (
        <>
          {/* ===== FALLBACK: Legacy KPIs when no governed indicators exist ===== */}
          <div className="kpi-grid">
            {executiveKpis.map((kpi) => (
              <KPICard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                trend={kpi.trend}
                tone={mapTone(kpi.tone)}
                caption={kpi.caption}
              />
            ))}
          </div>

          <SectionContainer
            title="Performance by Strategic Pillar"
            description="Each pillar blends indicator results and execution progress into one directional score."
          >
            <div className="two-column-grid">
              <div className="progress-grid">
                {pillars.map((pillar) => (
                  <ProgressCard
                    key={pillar.pillar}
                    title={pillar.pillar}
                    score={pillar.score}
                    trend={pillar.trend}
                    tone={mapTone(pillar.tone)}
                    meta={`${pillar.indicatorCount} indicators · ${pillar.activityCount} activities`}
                  />
                ))}
              </div>
              <ChartCard
                title="Strategic Balance"
                description="Pillar comparison helps leadership spot where execution and outcomes are drifting apart."
                footer="Lower-scoring pillars should drive portfolio review and resource allocation."
              >
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={pillars}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="pillar" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="score" fill="var(--purple-500)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          </SectionContainer>
        </>
      )}

      {/* ===== ALERTS & INSIGHTS ===== */}
      <div className="two-column-grid">
        <SectionContainer
          title="Alerts"
          description="Flagged risks from asset performance, indicator weakness, and data completeness."
        >
          <div className="alert-grid">
            {alerts.underperformingAssets.map((alert) => (
              <AlertCard key={alert.title} title={alert.title} detail={alert.detail} tone="critical" />
            ))}
            {alerts.decliningIndicators.map((alert) => (
              <AlertCard key={alert.title} title={alert.title} detail={alert.detail} tone="warning" />
            ))}
            {alerts.dataGaps.map((alert) => (
              <AlertCard key={alert.title} title={alert.title} detail={alert.detail} tone="warning" />
            ))}
            {!alerts.underperformingAssets.length && !alerts.decliningIndicators.length && !alerts.dataGaps.length && (
              <div className="empty-alert">No active alerts. All systems are within expected parameters.</div>
            )}
          </div>
        </SectionContainer>

        <SectionContainer
          title="Insights"
          description="Auto-generated interpretation for leadership decision-making."
        >
          <div className="insight-grid">
            {insights.map((insight) => (
              <InsightCard
                key={insight.title}
                title={insight.title}
                text={insight.text}
                emphasis={insight.emphasis}
                tone={mapTone(insight.tone)}
              />
            ))}
          </div>
        </SectionContainer>
      </div>
    </div>
  );
}

// ===== SIGNAL BLOCK COMPONENT =====
function SignalBlock({ label, performance, status, trend, subMetrics, indicatorCount }) {
  const statusColor = status === "good" ? "var(--green-600)" : status === "warning" ? "var(--amber-500)" : "var(--red-500)";
  const statusBg = status === "good" ? "var(--green-50)" : status === "warning" ? "var(--amber-100)" : "var(--red-100)";
  const trendIcon = trend > 0 ? "\u2191" : trend < 0 ? "\u2193" : "\u2192";

  return (
    <div className="signal-block" style={{ borderTopColor: statusColor }}>
      <div className="signal-block-header">
        <div className="signal-block-label">{label}</div>
        <span className={`signal-status-badge`} style={{ background: statusBg, color: statusColor }}>
          {status === "good" ? "On Track" : status === "warning" ? "Warning" : "Critical"}
        </span>
      </div>
      <div className="signal-block-value">
        {performance !== null ? `${performance}%` : "--"}
      </div>
      <div className="signal-block-trend" style={{ color: trend > 0 ? "var(--green-600)" : trend < 0 ? "var(--red-500)" : "var(--gray-500)" }}>
        {trendIcon} {trend !== null && trend !== undefined ? `${Math.abs(trend)}% trend` : "No trend data"}
      </div>
      <div className="signal-block-metrics">
        {subMetrics.map((m) => (
          <div key={m.label} className="signal-metric-row">
            <span className="signal-metric-label">{m.label}</span>
            <span className="signal-metric-value">{m.value}</span>
          </div>
        ))}
      </div>
      <div className="signal-block-footer">
        {indicatorCount} indicator{indicatorCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ===== DATA CONFIDENCE BAR =====
function DataConfidenceBar({ confidence }) {
  if (!confidence) return null;
  const statusColors = {
    good: { bg: "var(--green-50)", border: "var(--green-500)", text: "var(--green-800)" },
    warning: { bg: "var(--amber-100)", border: "var(--amber-500)", text: "var(--gray-800)" },
    critical: { bg: "var(--red-100)", border: "var(--red-500)", text: "var(--gray-800)" }
  };
  const colors = statusColors[confidence.status] || statusColors.critical;

  return (
    <div className="data-confidence-bar" style={{ background: colors.bg, borderColor: colors.border }}>
      <div className="data-confidence-content">
        <div className="data-confidence-main">
          <span className="data-confidence-label">Data Confidence</span>
          <span className="data-confidence-value" style={{ color: colors.text }}>
            {confidence.overall}%
          </span>
        </div>
        <div className="data-confidence-details">
          <span>Indicators: {confidence.indicators}</span>
          <span className="data-confidence-sep">|</span>
          <span>Surveys: {confidence.surveys > 0 ? `${confidence.surveys} responses` : "No data"}</span>
          <span className="data-confidence-sep">|</span>
          <span>Outcomes: {confidence.outcomes > 0 ? `${confidence.outcomes} records` : "No data"}</span>
        </div>
      </div>
      {confidence.status !== "good" && (
        <div className="data-confidence-warning">
          Low data coverage reduces confidence in results. Prioritize data collection.
        </div>
      )}
    </div>
  );
}

function mapTone(tone) {
  if (tone === "critical") return "critical";
  if (tone === "warning") return "warning";
  return "good";
}
