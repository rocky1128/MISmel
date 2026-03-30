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
        title="Loading overview"
        description="Gathering current results and recent issues."
      />
    );
  }

  if (error) {
    return (
      <PageError
        title="Overview could not load"
        description="This screen depends on indicators, activities, assets, and evidence."
        message={error}
      />
    );
  }

  const hasGovernedData = computedResults.length > 0;
  const hasLegacyDashboardData = metrics.length > 0 || indicators.length > 0 || activities.length > 0 || evidence.length > 0;
  const hasDomainData = domainSummary.length > 0;
  const sb = signalBlocks;

  if (!hasGovernedData && !hasLegacyDashboardData) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Overview"
          title="Programme snapshot"
          description="See performance, data coverage, and issues that need follow-up."
          meta={
            <div className="badge badge-purple">
              <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
              {currentPeriod}
            </div>
          }
        />
        <div className="card">
          <EmptyPanel
            title="No reporting data yet"
            text="Add indicators and start submitting results to populate the overview."
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
        eyebrow="Overview"
        title="Programme snapshot"
        description="See performance, data coverage, and issues that need follow-up."
        meta={
          <div className="badge badge-purple">
            <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
            {currentPeriod}
          </div>
        }
      />

      {hasGovernedData ? (
        <>
          <div className="signal-grid">
            <SignalBlock
              label="Scale"
              performance={sb.scale.performance}
              status={sb.scale.status}
              trend={sb.scale.trend}
              subMetrics={sb.scale.subMetrics}
              indicatorCount={sb.scale.indicatorCount}
            />
            <SignalBlock
              label="Engagement"
              performance={sb.engagement.performance}
              status={sb.engagement.status}
              trend={sb.engagement.trend}
              subMetrics={sb.engagement.subMetrics}
              indicatorCount={sb.engagement.indicatorCount}
            />
            <SignalBlock
              label="Learning"
              performance={sb.learning.performance}
              status={sb.learning.status}
              trend={sb.learning.trend}
              subMetrics={sb.learning.subMetrics}
              indicatorCount={sb.learning.indicatorCount}
            />
            <SignalBlock
              label="Outcomes"
              performance={sb.outcomes.performance}
              status={sb.outcomes.status}
              trend={sb.outcomes.trend}
              subMetrics={sb.outcomes.subMetrics}
              indicatorCount={sb.outcomes.indicatorCount}
            />
          </div>

          <DataConfidenceBar confidence={sb.dataConfidence} />

          <SectionContainer
            title="Performance by domain"
            description="A quick comparison of the main programme areas."
          >
            {hasDomainData ? (
              <div className="two-column-grid">
                <div className="progress-grid">
                  {domainSummary.map((domain) => (
                    <ProgressCard
                      key={domain.key}
                      title={domain.label}
                      score={domain.performance}
                      trend={domain.trend}
                      tone={mapTone(domain.status)}
                      meta={`${domain.indicatorCount} indicators / ${domain.dataCompleteness}% complete`}
                    />
                  ))}
                </div>
                <ChartCard
                  title="Domain comparison"
                  description="Use this to spot strong areas and weak ones quickly."
                  footer="Low scores usually point to weaker results or thin data coverage."
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
                  title="No domain data yet"
                  text="This chart will appear once indicators start producing results."
                />
              </div>
            )}
          </SectionContainer>

          <SectionContainer
            title="Indicator results"
            description="Current computed results across active indicators."
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
                      {computedResults.slice(0, 20).map((result) => (
                        <tr key={result.indicator_id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{result.indicator_name}</div>
                            {result.indicator_code ? <div className="table-detail">{result.indicator_code}</div> : null}
                          </td>
                          <td>
                            <span className="badge badge-purple">
                              {MEL_DOMAINS.find((domain) => domain.key === result.domain)?.label || result.domain}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{result.value !== null ? result.value : "--"}</td>
                          <td>{result.target}</td>
                          <td>
                            <div className="dashboard-value-inline">
                              <div className="progress-bar" style={{ width: 72 }}>
                                <div
                                  className={`progress-fill ${result.status}`}
                                  style={{ width: `${Math.min(result.performance || 0, 100)}%` }}
                                />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700 }}>
                                {result.performance !== null ? `${result.performance}%` : "--"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${result.status === "good" ? "green" : result.status === "warning" ? "amber" : "red"}`}>
                              <span className="badge-dot" />
                              {result.status === "good" ? "On track" : result.status === "warning" ? "Warning" : "Critical"}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 12,
                                color: result.data_coverage >= 80
                                  ? "var(--green-600)"
                                  : result.data_coverage >= 50
                                    ? "var(--amber-500)"
                                    : "var(--red-500)"
                              }}
                            >
                              {result.data_coverage}%
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
            title="Performance by pillar"
            description="A simple summary of how each pillar is doing."
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
                    meta={`${pillar.indicatorCount} indicators / ${pillar.activityCount} activities`}
                  />
                ))}
              </div>
              <ChartCard
                title="Pillar comparison"
                description="Shows where delivery and results are stronger or weaker."
                footer="Lower scores are usually the best place to start follow-up."
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

      <div className="two-column-grid">
        <SectionContainer
          title="Needs attention"
          description="Items that may need follow-up now."
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
            {!alerts.underperformingAssets.length && !alerts.decliningIndicators.length && !alerts.dataGaps.length ? (
              <div className="empty-alert">No urgent issues right now.</div>
            ) : null}
          </div>
        </SectionContainer>

        <SectionContainer
          title="Highlights"
          description="Short notes pulled from the current data."
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

function SignalBlock({ label, performance, status, trend, subMetrics, indicatorCount }) {
  const statusColor = status === "good" ? "var(--green-600)" : status === "warning" ? "var(--amber-500)" : "var(--red-500)";
  const statusBg = status === "good" ? "var(--green-50)" : status === "warning" ? "var(--amber-100)" : "var(--red-100)";
  const trendIcon = trend > 0 ? "\u2191" : trend < 0 ? "\u2193" : "\u2192";

  return (
    <div className="signal-block" style={{ borderLeftColor: statusColor }}>
      <div className="signal-block-header">
        <div className="signal-block-label">{label}</div>
        <span className="signal-status-badge" style={{ background: statusBg, color: statusColor }}>
          {status === "good" ? "On track" : status === "warning" ? "Warning" : "Critical"}
        </span>
      </div>
      <div className="signal-block-value">
        {performance !== null ? `${performance}%` : "--"}
      </div>
      <div className="signal-block-trend" style={{ color: trend > 0 ? "var(--green-600)" : trend < 0 ? "var(--red-500)" : "var(--gray-500)" }}>
        {trendIcon} {trend !== null && trend !== undefined ? `${Math.abs(trend)}% trend` : "No trend data"}
      </div>
      <div className="signal-block-metrics">
        {subMetrics.map((metric) => (
          <div key={metric.label} className="signal-metric-row">
            <span className="signal-metric-label">{metric.label}</span>
            <span className="signal-metric-value">{metric.value}</span>
          </div>
        ))}
      </div>
      <div className="signal-block-footer">
        {indicatorCount} indicator{indicatorCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

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
          <span className="data-confidence-label">Data confidence</span>
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
      {confidence.status !== "good" ? (
        <div className="data-confidence-warning">
          Low coverage means these results should be reviewed with care.
        </div>
      ) : null}
    </div>
  );
}

function mapTone(tone) {
  if (tone === "critical") return "critical";
  if (tone === "warning") return "warning";
  return "good";
}
