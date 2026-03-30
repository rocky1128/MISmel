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
import { buildLatestMediaRecords, buildMediaPlatformRows, summarizeMediaRecords } from "../lib/mediaMetrics";
import { buildWeeklyTimeSeries, compactNumber, getSeriesTrend } from "../lib/melAnalytics";

const TABS = ["Overview", "Engagement", "Learning", "Outcomes", "Content", "Trends"];

export default function AssetPerformance() {
  const { assetSlug = "virtual-university" } = useParams();
  const navigate = useNavigate();
  const {
    loading, error, asset, assets, assetMetrics, assetIndicators, mediaRecords, mediaSummary, platformRows, trendSeries, assetInsights,
    surveyResponses, followUpData, computedAssetScores, computedResults
  } = useAssetData(assetSlug);
  const [tab, setTab] = useState("Overview");
  const [selectedVideoKey, setSelectedVideoKey] = useState("");

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
  const hasMediaRecords = mediaRecords.length > 0;
  const filteredMediaRecords = useMemo(
    () => (selectedVideoKey ? mediaRecords.filter((record) => record.contentKey === selectedVideoKey) : mediaRecords),
    [mediaRecords, selectedVideoKey]
  );
  const filteredLatestMediaRecords = useMemo(
    () => buildLatestMediaRecords(filteredMediaRecords),
    [filteredMediaRecords]
  );
  const filteredMediaSummary = useMemo(
    () => summarizeMediaRecords(filteredMediaRecords),
    [filteredMediaRecords]
  );
  const filteredPlatformRows = useMemo(
    () => buildMediaPlatformRows(filteredLatestMediaRecords),
    [filteredLatestMediaRecords]
  );
  const filteredMetrics = useMemo(
    () => (selectedVideoKey ? assetMetrics.filter((metric) => metric.contentKey === selectedVideoKey) : assetMetrics),
    [assetMetrics, selectedVideoKey]
  );
  const filteredTrendSeries = useMemo(
    () => buildWeeklyTimeSeries(filteredMetrics, ["views", "unique_reach", "new_followers", "engagement_rate", "watch_time_min", "cta_clicks"]),
    [filteredMetrics]
  );
  const displayKpis = useMemo(
    () => [
      {
        label: selectedVideoKey ? "Snapshots" : "Videos Tracked",
        value: compactNumber(selectedVideoKey ? filteredMediaRecords.length : filteredMediaSummary.trackedVideos),
        trend: filteredMediaRecords.length
      },
      {
        label: "Views",
        value: compactNumber(filteredMediaSummary.totals.views),
        trend: getSeriesTrend(filteredTrendSeries, "views")
      },
      {
        label: "Reach",
        value: compactNumber(filteredMediaSummary.totals.uniqueReach),
        trend: getSeriesTrend(filteredTrendSeries, "unique_reach")
      },
      {
        label: "Watch Time",
        value: compactNumber(filteredMediaSummary.totals.watchTime),
        trend: getSeriesTrend(filteredTrendSeries, "watch_time_min")
      },
      {
        label: "New Followers",
        value: compactNumber(filteredMediaSummary.totals.newFollowers),
        trend: getSeriesTrend(filteredTrendSeries, "new_followers")
      }
    ],
    [filteredMediaRecords.length, filteredMediaSummary, filteredTrendSeries, selectedVideoKey]
  );

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
  const videoOptions = useMemo(
    () => {
      const uniqueRecords = new Map();
      for (const record of mediaRecords) {
        if (!uniqueRecords.has(record.contentKey)) {
          uniqueRecords.set(record.contentKey, record);
        }
      }

      return [
        { value: "", label: "All videos" },
        ...[...uniqueRecords.values()].map((record) => ({
          value: record.contentKey,
          label: record.videoId ? `${record.videoId} - ${record.title || record.platform}` : record.title || record.platform || "Video"
        }))
      ];
    },
    [mediaRecords]
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
            {hasMediaRecords ? (
              <div className="page-select-wrap">
                <span className="page-select-label">Video</span>
                <SelectField
                  variant="page"
                  className="page-select"
                  value={selectedVideoKey}
                  onChange={setSelectedVideoKey}
                  options={videoOptions}
                />
              </div>
            ) : null}
          </div>
        }
      />

      {/* KPI ROW */}
      <div className="kpi-grid">
        {displayKpis.map((kpi) => (
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
          <ChartCard title="Tracked Videos" description="Recent video records saved for this asset."
            footer="Each row represents one saved video record for this asset.">
            {hasMediaRecords ? (
              <table className="list-table">
                <tbody>
                  {filteredLatestMediaRecords.slice(0, 6).map((record) => (
                    <tr key={record.key}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{record.videoId || "Video record"}</div>
                        <div className="table-detail">{record.title || "Untitled video"}</div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700 }}>{formatDate(record.snapshotDate || record.date)}</div>
                        <div className="table-detail">{record.platform || "--"}</div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {compactMetric(record.values.views)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {compactMetric(record.values.unique_reach)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyPanel
                title="No video records yet"
                text="Submit media rows for this asset to see tracked content here."
                actions={[
                  { label: "Collect Data", to: "/data-collection" }
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
            {filteredPlatformRows.length ? (
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={filteredPlatformRows}>
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
          <SectionContainer title="Channel Detail" description="Break down saved video performance by platform.">
            {filteredPlatformRows.length ? (
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Videos</th>
                    <th>Avg Engagement</th>
                    <th>Avg Completion</th>
                    <th>New Followers</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlatformRows.map((row) => (
                    <tr key={row.source}>
                      <td><div style={{ fontWeight: 700 }}>{row.source}</div></td>
                      <td style={{ textAlign: "right" }}>{row.videos}</td>
                      <td style={{ textAlign: "right" }}>{formatPercent(row.engagement)}</td>
                      <td style={{ textAlign: "right" }}>{formatPercent(row.completion)}</td>
                      <td style={{ textAlign: "right" }}>{compactMetric(row.followers)}</td>
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
        <SectionContainer title="Tracked Content" description="Video-level performance and audience details for this asset.">
          {filteredLatestMediaRecords.length ? (
            <>
              <div className="summary-strip" style={{ marginBottom: 16 }}>
                <SummaryTile label="Videos tracked" value={selectedVideoKey ? filteredLatestMediaRecords.length : filteredMediaSummary.trackedVideos} />
                <SummaryTile label="Avg completion" value={formatPercent(filteredMediaSummary.averages.completionRate)} />
                <SummaryTile label="Avg engagement" value={formatPercent(filteredMediaSummary.averages.engagementRate)} />
                <SummaryTile label="CTA clicks" value={compactMetric(filteredMediaSummary.totals.ctaClicks)} />
              </div>

              <div className="card">
                <div className="card-body flush">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Video</th>
                          <th>Snapshot</th>
                          <th>Platform</th>
                          <th>Views</th>
                          <th>Reach</th>
                          <th>Watch Time</th>
                          <th>Completion</th>
                          <th>Engagement</th>
                          <th>Followers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLatestMediaRecords.map((record) => (
                          <tr key={record.key}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{record.videoId || "--"}</div>
                              <div className="table-detail">{record.title || "Untitled video"}</div>
                            </td>
                            <td>{formatDate(record.snapshotDate || record.date)}</td>
                            <td>{record.platform || "--"}</td>
                            <td style={{ fontWeight: 700 }}>{compactMetric(record.values.views)}</td>
                            <td>{compactMetric(record.values.unique_reach)}</td>
                            <td>{compactMetric(record.values.watch_time_min)}</td>
                            <td>{formatPercent(record.values.completion_rate)}</td>
                            <td>{formatPercent(record.values.engagement_rate)}</td>
                            <td>{compactMetric(record.values.new_followers)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="section-copy">
                    <div className="section-title">Audience breakdown</div>
                    <div className="section-text">Average audience mix from the submitted video rows.</div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="summary-strip">
                    <SummaryTile label="Male" value={formatPercent(filteredMediaSummary.averages.malePct)} />
                    <SummaryTile label="Female" value={formatPercent(filteredMediaSummary.averages.femalePct)} />
                    <SummaryTile label="18-24" value={formatPercent(filteredMediaSummary.averages.age18to24)} />
                    <SummaryTile label="25-30" value={formatPercent(filteredMediaSummary.averages.age25to30)} />
                    <SummaryTile label="31-35" value={formatPercent(filteredMediaSummary.averages.age31to35)} />
                    <SummaryTile label="36+" value={formatPercent(filteredMediaSummary.averages.age36Plus)} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <EmptyPanel title="No tracked content yet"
                text="Submit manual or bulk media rows for this asset to see video-level performance and audience details." />
            </div>
          )}
        </SectionContainer>
      )}

      {/* TRENDS */}
      {tab === "Trends" && (
        <ChartCard
          title="Trend Lines"
          description="Weekly movement across views, reach, followers, and engagement."
          footer="Each point represents the reporting week of the submitted snapshot."
        >
          {filteredTrendSeries.length ? (
            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <LineChart data={filteredTrendSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="var(--purple-500)" strokeWidth={2} />
                  <Line type="monotone" dataKey="unique_reach" stroke="var(--green-500)" strokeWidth={2} />
                  <Line type="monotone" dataKey="engagement_rate" stroke="var(--amber-500)" strokeWidth={2} />
                  <Line type="monotone" dataKey="new_followers" stroke="#0f766e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              title="No trend history yet"
              text="Charts will appear here once the asset has time-based media snapshots."
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

function SummaryTile({ label, value }) {
  return (
    <div className="summary-tile">
      <div className="summary-tile-label">{label}</div>
      <div className="summary-tile-value">{value}</div>
    </div>
  );
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(Number(value) * 100)}%`;
}

function compactMetric(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en", {
    notation: Number(value) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(Number(value));
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
