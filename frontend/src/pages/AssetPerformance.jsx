import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Bar, BarChart } from "recharts";
import { useNavigate, useParams } from "react-router-dom";
import useAssetData from "../hooks/useAssetData";
import PageHeader from "../components/layout/PageHeader";
import KPICard from "../components/ui/KPICard";
import SectionContainer from "../components/ui/SectionContainer";
import ChartCard from "../components/ui/ChartCard";
import InsightCard from "../components/ui/InsightCard";
import SelectField from "../components/ui/SelectField";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";
import { MEL_DOMAINS } from "../lib/indicatorEngine";

const TABS = ["Overview", "Engagement", "Learning", "Outcomes", "Content", "Trends"];

export default function AssetPerformance() {
  const { assetSlug = "virtual-university" } = useParams();
  const navigate = useNavigate();
  const {
    loading, error, asset, assets, assetIndicators, platformRows, trendSeries, assetKpis, assetInsights,
    surveyResponses, followUpData, computedAssetScores, computedResults
  } = useAssetData(assetSlug);
  const [tab, setTab] = useState("Overview");

  const relatedIndicators = useMemo(
    () => [...assetIndicators].sort((l, r) => r.performanceScore - l.performanceScore),
    [assetIndicators]
  );

  // Asset-specific survey data
  const assetSurveys = useMemo(() => {
    if (!asset) return { pre: [], post: [], measures: [] };
    const surveys = (surveyResponses || []).filter((s) => s.asset_id === asset.id);
    const pre = surveys.filter((s) => s.survey_type === "pre");
    const post = surveys.filter((s) => s.survey_type === "post");

    const measures = [
      { key: "confidence_score", label: "Confidence" },
      { key: "job_readiness_score", label: "Job Readiness" },
      { key: "leadership_score", label: "Leadership" },
      { key: "skills_application_score", label: "Skills Application" }
    ].map((m) => {
      const preVals = pre.map((s) => s[m.key]).filter((v) => v != null);
      const postVals = post.map((s) => s[m.key]).filter((v) => v != null);
      const preAvg = preVals.length ? +(preVals.reduce((a, b) => a + Number(b), 0) / preVals.length).toFixed(1) : null;
      const postAvg = postVals.length ? +(postVals.reduce((a, b) => a + Number(b), 0) / postVals.length).toFixed(1) : null;
      return { ...m, preAvg, postAvg, change: preAvg && postAvg ? +(postAvg - preAvg).toFixed(1) : null };
    });

    return { pre, post, measures, total: surveys.length };
  }, [asset, surveyResponses]);

  // Asset-specific follow-up data
  const assetFollowUps = useMemo(() => {
    if (!asset) return { total: 0, employed: 0, business: 0, furtherEd: 0, employmentRate: null, businessRate: null };
    const fups = (followUpData || []).filter((f) => f.asset_id === asset.id);
    const employed = fups.filter((f) => f.is_employed).length;
    const business = fups.filter((f) => f.business_created).length;
    const furtherEd = fups.filter((f) => f.outcome === "further_education").length;
    return {
      total: fups.length,
      employed,
      business,
      furtherEd,
      employmentRate: fups.length ? Math.round((employed / fups.length) * 100) : null,
      businessRate: fups.length ? Math.round((business / fups.length) * 100) : null
    };
  }, [asset, followUpData]);

  // Asset engine score
  const assetScore = useMemo(() => {
    if (!asset) return null;
    return (computedAssetScores || []).find((s) => s.asset_id === asset.id) || null;
  }, [asset, computedAssetScores]);
  const hasEngagementMetrics = platformRows.length > 0;
  const hasTrendData = trendSeries.length > 0;

  // Engine results for this asset
  const assetEngineResults = useMemo(() => {
    if (!asset) return [];
    return (computedResults || []).filter((r) => r.asset_id === asset.id);
  }, [asset, computedResults]);

  // Top/bottom episodes (from metrics or episodes data)
  const assetLabels = useMemo(() => {
    const map = {};
    for (const a of assets || []) map[a.slug] = a.name;
    return map;
  }, [assets]);
  const assetOptions = useMemo(
    () => Object.entries(assetLabels).map(([slug, label]) => ({ value: slug, label })),
    [assetLabels]
  );

  if (loading) {
    return <PageLoading title="Loading asset performance" description="Assembling KPI, engagement, learning, outcome, and trend data." />;
  }
  if (error) {
    return <PageError title="Asset performance could not load" message={error} />;
  }
  if (!asset) {
    return <div className="card"><EmptyPanel title="Asset not found" text="Choose an asset from the sidebar." /></div>;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Institutional Assets"
        title={asset.name}
        description={asset.description || "Multi-domain performance view for this institutional asset."}
        actions={
          <div className="page-actions-inline">
            <div className="page-select-wrap">
              <span className="page-select-label">Asset</span>
              <SelectField
                variant="page"
                className="page-select"
                value={assetSlug}
                onChange={(nextValue) => navigate(`/assets/${nextValue}`)}
                options={assetOptions}
                placeholder="Choose asset"
              />
            </div>
          </div>
        }
      />

      {/* KPI ROW */}
      <div className="kpi-grid">
        {assetKpis.map((kpi) => (
          <KPICard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend}
            tone={kpi.trend < -5 ? "critical" : kpi.trend < 5 ? "warning" : "good"} />
        ))}
        {assetScore && (
          <KPICard label="MEL Score" value={`${assetScore.overall_score}%`}
            trend={0} tone={assetScore.overall_score >= 70 ? "good" : assetScore.overall_score >= 50 ? "warning" : "critical"}
            caption={`${assetScore.indicator_count} governed indicators`} />
        )}
      </div>

      {/* DOMAIN SCORE BAR (if engine results exist) */}
      {assetScore && (
        <div className="asset-domain-bar">
          {MEL_DOMAINS.map((d) => {
            const score = assetScore[`${d.key === "reach_and_scale" ? "reach" : d.key}_score`];
            return (
              <div key={d.key} className="asset-domain-item">
                <div className="asset-domain-label">{d.label}</div>
                <div className="asset-domain-score" style={{
                  color: score != null ? (score >= 70 ? "var(--green-600)" : score >= 50 ? "var(--amber-500)" : "var(--red-500)") : "var(--gray-400)"
                }}>
                  {score != null ? `${score}%` : "--"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="tab-strip">
        {TABS.map((t) => (
          <button key={t} className={`tab-pill ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "Overview" && (
        <div className="two-column-grid">
          <SectionContainer title="Overview" description="Asset contribution and strategic posture summary.">
            <div className="insight-grid">
              {assetInsights.map((i) => (
                <InsightCard key={i.title} title={i.title} text={i.text} emphasis={i.emphasis} tone={i.tone} />
              ))}
            </div>
          </SectionContainer>
          <ChartCard title="Indicator Snapshot" description="Linked indicators by performance."
            footer="Use low-scoring indicators to prioritize interventions.">
            {relatedIndicators.length ? (
              <table className="list-table">
                <tbody>
                  {relatedIndicators.slice(0, 6).map((i) => (
                    <tr key={i.id}>
                      <td><div style={{ fontWeight: 700 }}>{i.name}</div><div className="table-detail">{i.pillar}</div></td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{i.performanceScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyPanel
                title="No linked indicators yet"
                text="Connect reporting indicators to this asset to see a ranked performance snapshot."
                actions={[
                  { label: "Manage Indicators", to: "/indicators" }
                ]}
              />
            )}
          </ChartCard>
        </div>
      )}

      {/* ENGAGEMENT */}
      {tab === "Engagement" && (
        <div className="two-column-grid">
          <ChartCard title="Channel Comparison" description="Reach and views across platforms.">
            {hasEngagementMetrics ? (
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
            ) : (
              <EmptyPanel
                title="No engagement data yet"
                text="Submit asset metrics to compare performance across channels."
                actions={[
                  { label: "Collect Data", to: "/data-collection" }
                ]}
              />
            )}
          </ChartCard>
          <SectionContainer title="Engagement Detail" description="Channel performance breakdown.">
            {hasEngagementMetrics ? (
              <table className="list-table">
                <tbody>
                  {platformRows.map((row) => (
                    <tr key={row.source}>
                      <td><div style={{ fontWeight: 700 }}>{row.source}</div></td>
                      <td style={{ textAlign: "right" }}>{Math.round(row.engagement * 100)}%</td>
                      <td style={{ textAlign: "right" }}>{row.followers.toLocaleString()} followers</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyPanel
                title="No channel breakdown yet"
                text="The per-channel engagement table appears after the first metric submissions."
                actions={[
                  { label: "Collect Data", to: "/data-collection" }
                ]}
              />
            )}
          </SectionContainer>
        </div>
      )}

      {/* LEARNING (NEW - SURVEY DRIVEN) */}
      {tab === "Learning" && (
        <SectionContainer
          title="Learning Indicators"
          description="Pre/post survey-based learning measures for this asset. Data flows from survey_responses through the indicator engine."
        >
          {assetSurveys.total > 0 ? (
            <>
              <div className="summary-strip" style={{ marginBottom: 16 }}>
                <div className="summary-tile">
                  <div className="summary-tile-label">Pre Surveys</div>
                  <div className="summary-tile-value">{assetSurveys.pre.length}</div>
                </div>
                <div className="summary-tile">
                  <div className="summary-tile-label">Post Surveys</div>
                  <div className="summary-tile-value">{assetSurveys.post.length}</div>
                </div>
                <div className="summary-tile">
                  <div className="summary-tile-label">Total Responses</div>
                  <div className="summary-tile-value">{assetSurveys.total}</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body flush">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Measure</th>
                          <th>Pre-Assessment</th>
                          <th>Post-Assessment</th>
                          <th>Change</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetSurveys.measures.map((m) => (
                          <tr key={m.key}>
                            <td style={{ fontWeight: 600 }}>{m.label}</td>
                            <td>{m.preAvg !== null ? `${m.preAvg}/10` : "--"}</td>
                            <td style={{ fontWeight: 700 }}>{m.postAvg !== null ? `${m.postAvg}/10` : "--"}</td>
                            <td>
                              {m.change !== null ? (
                                <span className={`trend-badge ${m.change > 0 ? "trend-up" : m.change < 0 ? "trend-down" : ""}`}>
                                  {m.change > 0 ? "+" : ""}{m.change}
                                </span>
                              ) : "--"}
                            </td>
                            <td>
                              <span className={`badge ${m.change > 0 ? "badge-green" : m.change != null && m.change < 0 ? "badge-red" : "badge-muted"}`}>
                                <span className="badge-dot" />
                                {m.change > 0 ? "Improved" : m.change != null && m.change < 0 ? "Declined" : "Insufficient Data"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <EmptyPanel title="No survey data for this asset"
                text="Submit pre and post assessment surveys linked to this asset to see learning indicators." />
            </div>
          )}
        </SectionContainer>
      )}

      {/* OUTCOMES (NEW - FOLLOW-UP DRIVEN) */}
      {tab === "Outcomes" && (
        <SectionContainer
          title="Outcome Indicators"
          description="Follow-up data tracking employment, business creation, and transition outcomes for participants of this asset."
        >
          {assetFollowUps.total > 0 ? (
            <>
              <div className="summary-strip" style={{ marginBottom: 16 }}>
                <div className="summary-tile">
                  <div className="summary-tile-label">Follow-ups</div>
                  <div className="summary-tile-value">{assetFollowUps.total}</div>
                </div>
                <div className="summary-tile">
                  <div className="summary-tile-label">Employment Rate</div>
                  <div className="summary-tile-value">{assetFollowUps.employmentRate ?? "--"}%</div>
                </div>
                <div className="summary-tile">
                  <div className="summary-tile-label">Business Creation</div>
                  <div className="summary-tile-value">{assetFollowUps.businessRate ?? "--"}%</div>
                </div>
                <div className="summary-tile">
                  <div className="summary-tile-label">Further Education</div>
                  <div className="summary-tile-value">{assetFollowUps.furtherEd}</div>
                </div>
              </div>

              {relatedIndicators.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div className="section-copy">
                      <div className="section-title">Linked Outcome Indicators</div>
                    </div>
                  </div>
                  <div className="card-body flush">
                    <div className="two-column-grid">
                      <table className="list-table">
                        <tbody>
                          {relatedIndicators.slice(0, 5).map((i) => (
                            <tr key={i.id}>
                              <td><div style={{ fontWeight: 700 }}>{i.name}</div><div className="table-detail">Top performing</div></td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>{i.performanceScore}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <table className="list-table">
                        <tbody>
                          {[...relatedIndicators].reverse().slice(0, 5).map((i) => (
                            <tr key={i.id}>
                              <td><div style={{ fontWeight: 700 }}>{i.name}</div><div className="table-detail">Needs intervention</div></td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>{i.performanceScore}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <EmptyPanel title="No follow-up data for this asset"
                text="Submit follow-up records for participants of this asset to see outcome indicators." />
            </div>
          )}
        </SectionContainer>
      )}

      {/* CONTENT PERFORMANCE (NEW) */}
      {tab === "Content" && (
        <SectionContainer title="Content Performance" description="Top and bottom episodes by engagement and reach.">
          {assetEngineResults.length > 0 ? (
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
                      </tr>
                    </thead>
                    <tbody>
                      {assetEngineResults.map((r) => (
                        <tr key={r.indicator_id}>
                          <td style={{ fontWeight: 600 }}>{r.indicator_name}</td>
                          <td>
                            <span className="badge badge-purple">
                              {MEL_DOMAINS.find((d) => d.key === r.domain)?.label || r.domain}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{r.value ?? "--"}</td>
                          <td>{r.target}</td>
                          <td>
                            <div className="dashboard-value-inline">
                              <div className="progress-bar" style={{ width: 72 }}>
                                <div className={`progress-fill ${r.status}`} style={{ width: `${Math.min(r.performance || 0, 100)}%` }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700 }}>{r.performance ?? "--"}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${r.status === "good" ? "green" : r.status === "warning" ? "amber" : "red"}`}>
                              <span className="badge-dot" />
                              {r.status === "good" ? "On Track" : r.status === "warning" ? "Warning" : "Critical"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <EmptyPanel title="No engine results for this asset"
                text="Create governed indicators linked to this asset to see content performance from the indicator engine." />
            </div>
          )}
        </SectionContainer>
      )}

      {/* TRENDS */}
      {tab === "Trends" && (
        <ChartCard
          title="Trend Lines"
          description="Time-series movement across views, reach, followers, and engagement."
          footer="Trend direction matters more than raw spikes."
        >
          {hasTrendData ? (
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
          ) : (
            <EmptyPanel
              title="No trend history yet"
              text="Charts will appear here once the asset has time-based metric entries."
              actions={[
                { label: "Collect Data", to: "/data-collection" }
              ]}
            />
          )}
        </ChartCard>
      )}
    </div>
  );
}
