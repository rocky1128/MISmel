import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useDashboardData from "../hooks/useDashboardData";
import PageHeader from "../components/layout/PageHeader";
import SectionContainer from "../components/ui/SectionContainer";
import ChartCard from "../components/ui/ChartCard";
import ProgressCard from "../components/ui/ProgressCard";
import { PageError, PageLoading } from "../components/ui/PageStates";

export default function OperationsDashboard() {
  const {
    loading,
    error,
    currentPeriod,
    pillars,
    topIndicators,
    worstIndicators,
    activities,
    activityHealth,
    metrics
  } = useDashboardData();

  const metricSummary = [
    { label: "On Track Indicators", value: topIndicators.length ? topIndicators[0].performanceScore : 0 },
    { label: "Active Activities", value: activityHealth.active },
    { label: "Completed Activities", value: activityHealth.completed },
    { label: "Metric Rows", value: metrics.length }
  ];

  if (loading) {
    return (
      <PageLoading
        title="Loading strategic performance"
        description="Preparing grouped indicators, activity tracking, and detailed operating metrics."
      />
    );
  }

  if (error) {
    return (
      <PageError
        title="Strategic performance could not load"
        description="This view depends on grouped indicators, workplan execution, and operational metrics."
        message={error}
      />
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Strategic Performance"
        title="Operations and Delivery View"
        description="A detailed view for MEL managers to inspect pillar performance, delivery bottlenecks, and metric depth behind the executive story."
        meta={
          <div className="badge badge-purple">
            <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
            {currentPeriod}
          </div>
        }
      />

      <div className="summary-strip">
        {metricSummary.map((item) => (
          <div className="summary-tile" key={item.label}>
            <div className="summary-tile-label">{item.label}</div>
            <div className="summary-tile-value">{item.value}</div>
          </div>
        ))}
      </div>

      <SectionContainer
        title="Pillar Operating Detail"
        description="The same pillars shown to leadership, now exposed with deeper delivery context."
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
            title="Activity Execution Mix"
            description="Use the workload mix to understand whether delivery pressure is rising or stabilizing."
            footer="Interpretation: a high overdue count with low completion suggests execution support is needed before more targets are added."
          >
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart
                  data={[
                    { name: "Completed", value: activityHealth.completed },
                    { name: "Active", value: activityHealth.active },
                    { name: "Overdue", value: activityHealth.overdue }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--purple-500)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </SectionContainer>

      <div className="two-column-grid">
        <SectionContainer
          title="Top Performing Indicators"
          description="Use these as examples of what is currently working well."
        >
          <table className="list-table">
            <tbody>
              {topIndicators.map((indicator) => (
                <tr key={indicator.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{indicator.name}</div>
                    <div className="table-detail">{indicator.pillar}</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{indicator.performanceScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionContainer>

        <SectionContainer
          title="Watchlist Indicators"
          description="These need intervention, clarification, or data correction first."
        >
          <table className="list-table">
            <tbody>
              {worstIndicators.map((indicator) => (
                <tr key={indicator.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{indicator.name}</div>
                    <div className="table-detail">{indicator.pillar}</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{indicator.performanceScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionContainer>
      </div>

      <SectionContainer
        title="Priority Activities"
        description="A compact operational table for the activities that most affect current strategic delivery."
      >
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Pillar</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {activities.slice(0, 8).map((activity) => (
                <tr key={activity.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{activity.title}</div>
                    <div className="table-detail">{activity.objectiveCode}</div>
                  </td>
                  <td>{activity.pillar}</td>
                  <td>{activity.owner}</td>
                  <td>{activity.statusLabel}</td>
                  <td style={{ fontWeight: 700 }}>{activity.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionContainer>
    </div>
  );
}

function mapTone(tone) {
  if (tone === "critical") return "critical";
  if (tone === "warning") return "warning";
  return "good";
}
