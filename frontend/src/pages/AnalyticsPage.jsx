import { useState, useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend
} from "recharts";
import useMELData from "../hooks/useMELData";
import PageHeader from "../components/layout/PageHeader";
import SectionContainer from "../components/ui/SectionContainer";
import ChartCard from "../components/ui/ChartCard";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";
import { MEL_DOMAINS } from "../lib/indicatorEngine";

// ===== Helpers =====

const DOMAIN_COLORS = {
  reach_and_scale: "#8b37a8",
  inclusion: "#3b82f6",
  engagement: "#f59e0b",
  learning: "#10b981",
  outcomes: "#ef4444"
};

function statusColor(score) {
  if (score == null) return "var(--gray-300)";
  if (score >= 90) return "var(--green-600)";
  if (score >= 70) return "var(--amber-500)";
  return "var(--red-500)";
}

function statusLabel(score) {
  if (score == null) return "No data";
  if (score >= 90) return "On track";
  if (score >= 70) return "Warning";
  return "At risk";
}

function RankBadge({ rank }) {
  const colors = ["#f59e0b", "#6b7280", "#a16207"];
  return (
    <div style={{
      width: 24, height: 24, borderRadius: "50%",
      background: rank <= 3 ? colors[rank - 1] : "var(--gray-200)",
      color: rank <= 3 ? "#fff" : "var(--gray-600)",
      display: "grid", placeItems: "center",
      fontSize: 11, fontWeight: 800, flexShrink: 0
    }}>
      {rank}
    </div>
  );
}

// ===== Domain Score Cell =====

function ScoreCell({ score }) {
  if (score == null) return <span style={{ color: "var(--gray-400)", fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: statusColor(score), flexShrink: 0
      }} />
      <span style={{ fontWeight: 700, fontSize: 13 }}>{score}%</span>
    </div>
  );
}

// ===== Model Comparison =====

function ModelSummary({ assets, computedAssetScores }) {
  // Group assets by model-like categories
  const modelGroups = useMemo(() => {
    const groups = {};
    for (const asset of assets) {
      const model = asset.type ?? "Other";
      if (!groups[model]) groups[model] = [];
      groups[model].push(asset);
    }
    return groups;
  }, [assets]);

  const modelData = useMemo(() => {
    return Object.entries(modelGroups).map(([model, modelAssets]) => {
      const scores = modelAssets
        .map((a) => computedAssetScores.find((s) => s.asset_id === a.id))
        .filter(Boolean);
      const avgScore = scores.length
        ? Math.round(scores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / scores.length)
        : null;
      return { model, assetCount: modelAssets.length, avgScore };
    });
  }, [modelGroups, computedAssetScores]);

  if (!modelData.length) return null;

  return (
    <div className="card">
      <div className="card-body flush">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Model / Type</th>
                <th>Assets</th>
                <th>Avg Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {modelData
                .sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1))
                .map(({ model, assetCount, avgScore }) => (
                  <tr key={model}>
                    <td style={{ fontWeight: 600 }}>{model}</td>
                    <td>{assetCount}</td>
                    <td style={{ fontWeight: 700 }}>{avgScore != null ? `${avgScore}%` : "—"}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                        background: avgScore >= 90 ? "var(--green-50)" : avgScore >= 70 ? "var(--amber-100)" : "var(--red-100)",
                        color: statusColor(avgScore)
                      }}>
                        {statusLabel(avgScore)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== Main Page =====

export default function AnalyticsPage() {
  const { loading, error, assets, computedAssetScores, computedResults, governedIndicators, programs } = useMELData();
  const [compareMode, setCompareMode] = useState("assets"); // 'assets' | 'domains' | 'programs'
  const [selectedDomain, setSelectedDomain] = useState("all");

  if (loading) return <PageLoading title="Loading analytics" description="Preparing comparison data." />;
  if (error) return <PageError title="Could not load analytics" message={error} />;

  const hasAssetData = computedAssetScores.length > 0;
  const hasResults = computedResults.length > 0;

  // ===== Asset comparison data for bar chart =====
  const assetBarData = assets
    .map((asset) => {
      const score = computedAssetScores.find((s) => s.asset_id === asset.id);
      return {
        name: asset.name.length > 20 ? asset.name.slice(0, 18) + "…" : asset.name,
        fullName: asset.name,
        overall: score?.overall_score ?? 0,
        reach: score?.reach_score ?? 0,
        engagement: score?.engagement_score ?? 0,
        learning: score?.learning_score ?? 0,
        outcomes: score?.outcomes_score ?? 0,
        inclusion: score?.inclusion_score ?? 0,
        indicators: score?.indicator_count ?? 0
      };
    })
    .sort((a, b) => b.overall - a.overall);

  // ===== Domain breakdown across all assets =====
  const domainBarData = MEL_DOMAINS.map((domain) => {
    const results = computedResults.filter((r) => r.domain === domain.key && r.performance != null);
    const avg = results.length
      ? Math.round(results.reduce((s, r) => s + r.performance, 0) / results.length)
      : 0;
    const onTrack = results.filter((r) => r.performance >= 90).length;
    const atRisk = results.filter((r) => r.performance < 70).length;
    return {
      name: domain.label,
      key: domain.key,
      performance: avg,
      indicators: results.length,
      onTrack,
      atRisk,
      fill: domain.color
    };
  });

  // ===== Filtered indicator rankings =====
  const filteredResults = selectedDomain === "all"
    ? computedResults
    : computedResults.filter((r) => r.domain === selectedDomain);

  const topIndicators = [...filteredResults]
    .filter((r) => r.performance != null)
    .sort((a, b) => (b.performance ?? 0) - (a.performance ?? 0))
    .slice(0, 10);

  const bottomIndicators = [...filteredResults]
    .filter((r) => r.performance != null)
    .sort((a, b) => (a.performance ?? 0) - (b.performance ?? 0))
    .slice(0, 10);

  const hasAnyData = hasAssetData || hasResults;

  if (!hasAnyData) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Analytics"
          title="Programme comparison"
          description="Compare performance across assets, domains, and programme models."
        />
        <div className="card">
          <EmptyPanel
            title="No data to compare yet"
            text="Add governed indicators and run the engine to see comparative analytics."
            actions={[
              { label: "Manage Indicators", to: "/indicators" },
              { label: "Enter Data", to: "/data-collection", variant: "secondary" }
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Analytics"
        title="Programme comparison"
        description="Compare performance across assets, domains, and programme models to identify gaps and strengths."
      />

      {/* Mode selector */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-500)", marginRight: 4 }}>View:</span>
          {[
            { key: "assets", label: "Asset comparison" },
            { key: "domains", label: "Domain breakdown" },
            { key: "programs", label: "Programme models" }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCompareMode(key)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: compareMode === key ? "1px solid var(--purple-400)" : "1px solid var(--gray-200)",
                background: compareMode === key ? "var(--purple-50)" : "#fff",
                color: compareMode === key ? "var(--purple-700)" : "var(--gray-600)",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== ASSET COMPARISON ===== */}
      {compareMode === "assets" && (
        <>
          <div className="two-column-grid">
            <ChartCard
              title="Overall asset performance"
              description="Higher bars indicate stronger overall performance against targets."
              footer="Score = weighted average across all MEL domains."
            >
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={assetBarData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name, props) => [`${value}%`, props.payload.fullName]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Bar dataKey="overall" name="Overall" fill="var(--purple-500)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Outcomes vs Engagement"
              description="Side-by-side comparison of two key domains across assets."
            >
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={assetBarData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="outcomes" name="Outcomes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="engagement" name="Engagement" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Asset ranking table */}
          <SectionContainer
            title="Asset rankings"
            description="Sorted by overall score. Use this to identify the strongest and weakest assets."
          >
            <div className="card">
              <div className="card-body flush">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Asset</th>
                        <th>Overall</th>
                        <th>Reach</th>
                        <th>Engagement</th>
                        <th>Learning</th>
                        <th>Outcomes</th>
                        <th>Indicators</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetBarData.map((row, i) => (
                        <tr key={row.fullName}>
                          <td><RankBadge rank={i + 1} /></td>
                          <td style={{ fontWeight: 600 }}>{row.fullName}</td>
                          <td style={{ fontWeight: 800, fontSize: 15, color: statusColor(row.overall) }}>
                            {row.overall ? `${row.overall}%` : "—"}
                          </td>
                          <td><ScoreCell score={row.reach || null} /></td>
                          <td><ScoreCell score={row.engagement || null} /></td>
                          <td><ScoreCell score={row.learning || null} /></td>
                          <td><ScoreCell score={row.outcomes || null} /></td>
                          <td>{row.indicators}</td>
                          <td>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                              background: row.overall >= 90 ? "var(--green-50)" : row.overall >= 70 ? "var(--amber-100)" : "var(--red-100)",
                              color: statusColor(row.overall)
                            }}>
                              {statusLabel(row.overall)}
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
      )}

      {/* ===== DOMAIN BREAKDOWN ===== */}
      {compareMode === "domains" && (
        <>
          <ChartCard
            title="Performance by MEL domain"
            description="Average performance across all indicators per domain. Red bars need immediate attention."
            footer="Bars below 70% are critical — focus follow-up here first."
          >
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={domainBarData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, "Avg performance"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="performance" radius={[6, 6, 0, 0]}>
                    {domainBarData.map((entry) => (
                      <rect key={entry.key} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Domain summary cards */}
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {domainBarData.map((domain) => (
              <div key={domain.key} className="card card-body" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: domain.fill }}>
                    {domain.name}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                    background: domain.performance >= 90 ? "var(--green-50)" : domain.performance >= 70 ? "var(--amber-100)" : "var(--red-100)",
                    color: statusColor(domain.performance)
                  }}>
                    {statusLabel(domain.performance)}
                  </span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: statusColor(domain.performance) }}>
                  {domain.performance ? `${domain.performance}%` : "—"}
                </div>
                <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 4 }}>
                  {domain.indicators} indicator{domain.indicators !== 1 ? "s" : ""} ·{" "}
                  <span style={{ color: "var(--green-600)" }}>{domain.onTrack} on track</span>
                  {domain.atRisk > 0 && (
                    <span style={{ color: "var(--red-500)" }}> · {domain.atRisk} at risk</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Filter + indicator rankings */}
          <SectionContainer title="Indicator rankings" description="Filter by domain to see top and bottom performers.">
            <div style={{ marginBottom: 12 }}>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                style={{
                  padding: "8px 12px", borderRadius: 6, border: "1px solid var(--gray-200)",
                  fontSize: 13, fontWeight: 500, background: "#fff", cursor: "pointer"
                }}
              >
                <option value="all">All domains</option>
                {MEL_DOMAINS.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="two-column-grid">
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--green-700)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Top performers
                </div>
                <div className="card">
                  <div className="card-body flush">
                    {topIndicators.length === 0 ? (
                      <div style={{ padding: 16, color: "var(--gray-500)", fontSize: 13 }}>No data</div>
                    ) : (
                      <div>
                        {topIndicators.map((r, i) => (
                          <div key={r.indicator_id} style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "10px 16px", borderBottom: i < topIndicators.length - 1 ? "1px solid var(--gray-100)" : "none"
                          }}>
                            <RankBadge rank={i + 1} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.indicator_name}
                              </div>
                              <div className="table-detail">{r.domain?.replace(/_/g, " ")}</div>
                            </div>
                            <span style={{ fontWeight: 800, color: "var(--green-600)", fontSize: 14 }}>
                              {r.performance}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--red-500)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Needs attention
                </div>
                <div className="card">
                  <div className="card-body flush">
                    {bottomIndicators.length === 0 ? (
                      <div style={{ padding: 16, color: "var(--gray-500)", fontSize: 13 }}>No data</div>
                    ) : (
                      <div>
                        {bottomIndicators.map((r, i) => (
                          <div key={r.indicator_id} style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "10px 16px", borderBottom: i < bottomIndicators.length - 1 ? "1px solid var(--gray-100)" : "none"
                          }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: "50%", background: "var(--red-100)",
                              color: "var(--red-500)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800
                            }}>
                              {i + 1}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.indicator_name}
                              </div>
                              <div className="table-detail">{r.domain?.replace(/_/g, " ")}</div>
                            </div>
                            <span style={{ fontWeight: 800, color: "var(--red-500)", fontSize: 14 }}>
                              {r.performance}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionContainer>
        </>
      )}

      {/* ===== PROGRAMME MODELS ===== */}
      {compareMode === "programs" && (
        <>
          <SectionContainer
            title="Programme model comparison"
            description="Compare performance by asset type or configured programme models."
          >
            <ModelSummary assets={assets} computedAssetScores={computedAssetScores} />
          </SectionContainer>

          {programs.length > 0 && (
            <SectionContainer title="Configured programmes" description="Programme records from the MEL framework.">
              <div className="card">
                <div className="card-body flush">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Programme</th>
                          <th>Code</th>
                          <th>Model</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {programs.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                            <td>{p.code ?? "—"}</td>
                            <td>
                              {p.model ? (
                                <span className="badge badge-purple">{p.model}</span>
                              ) : "—"}
                            </td>
                            <td>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                                background: p.status === "active" ? "var(--green-50)" : "var(--gray-100)",
                                color: p.status === "active" ? "var(--green-700)" : "var(--gray-500)"
                              }}>
                                {p.status}
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
          )}

          {programs.length === 0 && (
            <div className="card">
              <EmptyPanel
                title="No programmes configured"
                text="Programmes are added via the migration or can be seeded through the database. Once added, comparative analytics will appear here."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
