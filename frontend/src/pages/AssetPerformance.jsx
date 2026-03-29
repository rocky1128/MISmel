import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Bar, BarChart } from "recharts";
import { useNavigate, useParams } from "react-router-dom";
import useAssetData from "../hooks/useAssetData";
import PageHeader from "../components/layout/PageHeader";
import KPICard from "../components/ui/KPICard";
import SectionContainer from "../components/ui/SectionContainer";
import ChartCard from "../components/ui/ChartCard";
import InsightCard from "../components/ui/InsightCard";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";

const TABS = ["Overview", "Engagement", "Outcomes", "Trends"];
const ASSET_LABELS = {
  "virtual-university": "Virtual University",
  hangout: "Hangout",
  "springboard-tv": "Springboard TV"
};

export default function AssetPerformance() {
  const { assetSlug = "virtual-university" } = useParams();
  const navigate = useNavigate();
  const { loading, error, asset, assetIndicators, platformRows, trendSeries, assetKpis, assetInsights } = useAssetData(assetSlug);
  const [tab, setTab] = useState("Overview");

  const relatedIndicators = useMemo(
    () => [...assetIndicators].sort((left, right) => right.performanceScore - left.performanceScore),
    [assetIndicators]
  );

  if (loading) {
    return (
      <PageLoading
        title="Loading asset performance"
        description="Assembling KPI, engagement, outcome, and trend data for this institutional asset."
      />
    );
  }

  if (error) {
    return (
      <PageError
        title="Asset performance could not load"
        description="This page depends on asset-linked metrics and indicators."
        message={error}
      />
    );
  }

  if (!asset) {
    return (
      <div className="card">
        <EmptyPanel
          title="Asset not found"
          text="Choose one of the configured institutional assets from the sidebar."
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Institutional Assets"
        title={asset.name}
        description={asset.description || "Performance view for this institutional asset."}
        actions={
          <div className="tab-strip">
            {Object.entries(ASSET_LABELS).map(([slug, label]) => (
              <button
                key={slug}
                className={`tab-pill ${assetSlug === slug ? "active" : ""}`}
                onClick={() => navigate(`/assets/${slug}`)}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="kpi-grid">
        {assetKpis.map((kpi) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
            tone={kpi.trend < -5 ? "critical" : kpi.trend < 5 ? "warning" : "good"}
          />
        ))}
      </div>

      <div className="tab-strip">
        {TABS.map((entry) => (
          <button key={entry} className={`tab-pill ${tab === entry ? "active" : ""}`} onClick={() => setTab(entry)}>
            {entry}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="two-column-grid">
          <SectionContainer
            title="Overview"
            description="A compact view of the asset's overall contribution and current strategic posture."
          >
            <div className="insight-grid">
              {assetInsights.map((insight) => (
                <InsightCard
                  key={insight.title}
                  title={insight.title}
                  text={insight.text}
                  emphasis={insight.emphasis}
                  tone={insight.tone}
                />
              ))}
            </div>
          </SectionContainer>

          <ChartCard
            title="Indicator Snapshot"
            description="Linked indicators reveal whether the asset is producing the intended outcomes."
            footer="Interpretation: use low-scoring indicators here to choose the next asset intervention."
          >
            <table className="list-table">
              <tbody>
                {relatedIndicators.slice(0, 6).map((indicator) => (
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
          </ChartCard>
        </div>
      ) : null}

      {tab === "Engagement" ? (
        <div className="two-column-grid">
          <ChartCard
            title="Channel Comparison"
            description="Compare reach and views across the channels contributing to this asset."
          >
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={platformRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="views" fill="var(--purple-500)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="reach" fill="var(--green-500)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <SectionContainer
            title="Engagement Detail"
            description="Use this panel to identify which channels deserve more distribution attention."
          >
            <table className="list-table">
              <tbody>
                {platformRows.map((row) => (
                  <tr key={row.source}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{row.source}</div>
                    </td>
                    <td style={{ textAlign: "right" }}>{Math.round(row.engagement * 100)}%</td>
                    <td style={{ textAlign: "right" }}>{row.followers.toLocaleString()} followers</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionContainer>
        </div>
      ) : null}

      {tab === "Outcomes" ? (
        <SectionContainer
          title="Outcome Indicators"
          description="Compare the strongest and weakest linked indicators to understand where this asset is helping or holding back strategy."
        >
          {relatedIndicators.length ? (
            <div className="two-column-grid">
              <table className="list-table">
                <tbody>
                  {relatedIndicators.slice(0, 5).map((indicator) => (
                    <tr key={indicator.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{indicator.name}</div>
                        <div className="table-detail">Top performing</div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{indicator.performanceScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="list-table">
                <tbody>
                  {[...relatedIndicators].reverse().slice(0, 5).map((indicator) => (
                    <tr key={indicator.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{indicator.name}</div>
                        <div className="table-detail">Needs intervention</div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{indicator.performanceScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No linked indicators" text="This asset does not yet have indicators attached to it." />
          )}
        </SectionContainer>
      ) : null}

      {tab === "Trends" ? (
        <ChartCard
          title="Trend Lines"
          description="Time-series movement across views, reach, followers, and engagement."
          footer="Interpretation: trend direction matters more than raw spikes. Use this to decide whether performance is stabilizing or deteriorating."
        >
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <LineChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="var(--purple-500)" strokeWidth={2} />
                <Line type="monotone" dataKey="unique_reach" stroke="var(--green-500)" strokeWidth={2} />
                <Line type="monotone" dataKey="new_followers" stroke="#0f766e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      ) : null}
    </div>
  );
}
