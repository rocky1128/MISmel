import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useDashboardData from "../hooks/useDashboardData";
import PageHeader from "../components/layout/PageHeader";
import SectionContainer from "../components/ui/SectionContainer";
import ChartCard from "../components/ui/ChartCard";
import ProgressCard from "../components/ui/ProgressCard";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";

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
  const hasOperationalData = metrics.length > 0 || activities.length > 0 || topIndicators.length > 0 || worstIndicators.length > 0;
  const hasPillarData = pillars.some((pillar) => pillar.indicatorCount > 0 || pillar.activityCount > 0);
  const hasActivityMix = activityHealth.total > 0;

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

  if (!hasOperationalData) {
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
        <div className="card">
          <EmptyPanel
            title="No operational data yet"
            text="Add indicators, activities, or metric submissions to unlock the delivery dashboards and charts."
            actions={[
              { label: "Open Settings", to: "/settings" },
              { label: "Collect Data", to: "/data-collection", variant: "secondary" }
            ]}
          />
        </div>
      </div>
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
        {hasPillarData || hasActivityMix ? (
          <div className="two-column-grid">
            <div className="progress-grid">
              {hasPillarData ? (
                pillars.map((pillar) => (
                  <ProgressCard
                    key={pillar.pillar}
                    title={pillar.pillar}
                    score={pillar.score}
                    trend={pillar.trend}
                    tone={mapTone(pillar.tone)}
                    meta={`${pillar.indicatorCount} indicators · ${pillar.activityCount} activities`}
                  />
                ))
              ) : (
                <div className="card">
                  <EmptyPanel
                    title="No pillar data yet"
                    text="Pillar performance appears after indicators or activities are classified into strategic pillars."
                  />
                </div>
              )}
            </div>
            <ChartCard
              title="Activity Execution Mix"
              description="Use the workload mix to understand whether delivery pressure is rising or stabilizing."
              footer="Interpretation: a high overdue count with low completion suggests execution support is needed before more targets are added."
            >
              {hasActivityMix ? (
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
              ) : (
                <EmptyPanel
                  title="No activity mix yet"
                  text="The execution chart appears after activities are added and start moving through statuses."
                />
              )}
            </ChartCard>
          </div>
        ) : (
          <div className="card">
            <EmptyPanel
              title="No delivery data yet"
              text="Once operations data starts flowing, this view will show pillar performance and activity mix charts."
            />
          </div>
        )}
      </SectionContainer>

      <div className="two-column-grid">
        <SectionContainer
          title="Top Performing Indicators"
          description="Use these as examples of what is currently working well."
        >
          {topIndicators.length ? (
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
          ) : (
            <EmptyPanel
              title="No top indicators yet"
              text="Indicator rankings will appear here after reporting targets and actuals are created."
            />
          )}
        </SectionContainer>

        <SectionContainer
          title="Watchlist Indicators"
          description="These need intervention, clarification, or data correction first."
        >
          {worstIndicators.length ? (
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
          ) : (
            <EmptyPanel
              title="No watchlist yet"
              text="Indicators that need intervention will surface here once live performance data exists."
            />
          )}
        </SectionContainer>
      </div>

      <SectionContainer
        title="Priority Activities"
        description="A compact operational table for the activities that most affect current strategic delivery."
      >
        {activities.length ? (
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
        ) : (
          <EmptyPanel
            title="No activities yet"
            text="Priority activities will populate here after the workplan is set up."
          />
        )}
      </SectionContainer>
    </div>
  );
}

function mapTone(tone) {
  if (tone === "critical") return "critical";
  if (tone === "warning") return "warning";
  return "good";
}
