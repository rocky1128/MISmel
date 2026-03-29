import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useDashboardData from "../hooks/useDashboardData";
import PageHeader from "../components/layout/PageHeader";
import KPICard from "../components/ui/KPICard";
import SectionContainer from "../components/ui/SectionContainer";
import ProgressCard from "../components/ui/ProgressCard";
import AlertCard from "../components/ui/AlertCard";
import InsightCard from "../components/ui/InsightCard";
import ChartCard from "../components/ui/ChartCard";
import { PageError, PageLoading } from "../components/ui/PageStates";

export default function ExecutiveDashboard() {
  const { loading, error, currentPeriod, executiveKpis, pillars, alerts, insights } = useDashboardData();

  if (loading) {
    return (
      <PageLoading
        title="Loading executive dashboard"
        description="Building the strategic snapshot, pillar progress, and decision-support insights."
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

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Executive Dashboard"
        title="Decision Support Overview"
        description="A concise, interpretation-led view of strategic momentum, pillar health, and the next issues leadership should act on."
        meta={
          <div className="badge badge-purple">
            <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
            {currentPeriod}
          </div>
        }
      />

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
            footer="Interpretation: lower-scoring pillars should drive portfolio review and resource allocation in the next planning cycle."
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
          </div>
        </SectionContainer>

        <SectionContainer
          title="Insights"
          description="Auto-generated interpretation turns raw metrics into a clearer narrative for leaders."
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

function mapTone(tone) {
  if (tone === "critical") return "critical";
  if (tone === "warning") return "warning";
  return "good";
}
