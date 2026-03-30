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
    { label: "Top score", value: topIndicators.length ? `${topIndicators[0].performanceScore}%` : "--" },
    { label: "Active tasks", value: activityHealth.active },
    { label: "Completed", value: activityHealth.completed },
    { label: "Rows", value: metrics.length }
  ];
  const hasOperationalData = metrics.length > 0 || activities.length > 0 || topIndicators.length > 0 || worstIndicators.length > 0;
  const hasPillarData = pillars.some((pillar) => pillar.indicatorCount > 0 || pillar.activityCount > 0);
  const hasActivityMix = activityHealth.total > 0;

  if (loading) {
    return (
      <PageLoading
        title="Loading performance view"
        description="Preparing indicators, activities, and recent results."
      />
    );
  }

  if (error) {
    return (
      <PageError
        title="Performance view could not load"
        description="This screen depends on grouped indicators, activities, and metrics."
        message={error}
      />
    );
  }

  if (!hasOperationalData) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Performance"
          title="Delivery and follow-up"
          description="Review pillar performance, indicator outliers, and active work."
          meta={
            <div className="badge badge-purple">
              <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
              {currentPeriod}
            </div>
          }
        />
        <div className="card">
          <EmptyPanel
            title="No operations data yet"
            text="Add indicators, activities, or metric submissions to unlock this view."
            actions={[
              { label: "Open Settings", to: "/settings" },
              { label: "Data Entry", to: "/data-collection", variant: "secondary" }
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Performance"
        title="Delivery and follow-up"
        description="Review pillar performance, indicator outliers, and active work."
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
        title="Performance by pillar"
        description="See where delivery is strong and where it needs support."
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
                    meta={`${pillar.indicatorCount} indicators / ${pillar.activityCount} activities`}
                  />
                ))
              ) : (
                <div className="card">
                  <EmptyPanel
                    title="No pillar data yet"
                    text="Pillar performance appears after indicators or activities are classified."
                  />
                </div>
              )}
            </div>
            <ChartCard
              title="Activity mix"
              description="A quick breakdown of completed, active, and overdue work."
              footer="If overdue work keeps rising, follow-up usually needs to happen before adding more tasks."
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
                  text="This chart appears after activities are added and updated."
                />
              )}
            </ChartCard>
          </div>
        ) : (
          <div className="card">
            <EmptyPanel
              title="No delivery data yet"
              text="This view will fill in once operational data starts coming in."
            />
          </div>
        )}
      </SectionContainer>

      <div className="two-column-grid">
        <SectionContainer
          title="Top indicators"
          description="The strongest performers right now."
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
              text="Indicator rankings will appear after targets and results are added."
            />
          )}
        </SectionContainer>

        <SectionContainer
          title="Needs follow-up"
          description="Indicators that need intervention or review."
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
              text="Indicators that need attention will appear here once live data exists."
            />
          )}
        </SectionContainer>
      </div>

      <SectionContainer
        title="Active work"
        description="The activities most likely to affect current delivery."
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
            text="Activities will appear here after the workplan is set up."
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
