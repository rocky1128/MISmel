import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart, ReferenceLine
} from "recharts";
import useMELData from "../hooks/useMELData";
import PageHeader from "../components/layout/PageHeader";
import SectionContainer from "../components/ui/SectionContainer";
import ChartCard from "../components/ui/ChartCard";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";
import { MEL_DOMAINS } from "../lib/indicatorEngine";

// ===== Helpers =====

function getStatus(performance) {
  if (performance == null) return "no-data";
  if (performance >= 90) return "good";
  if (performance >= 70) return "warning";
  return "critical";
}

const statusLabels = { good: "On track", warning: "Warning", critical: "At risk", "no-data": "No data" };
const statusClasses = { good: "badge-green", warning: "badge-amber", critical: "badge-red", "no-data": "badge-gray" };
const statusColors = { good: "var(--green-600)", warning: "var(--amber-500)", critical: "var(--red-500)", "no-data": "var(--gray-400)" };

function StatusBadge({ performance }) {
  const s = getStatus(performance);
  return (
    <span className={`badge ${statusClasses[s]}`}>
      <span className="badge-dot" />
      {statusLabels[s]}
    </span>
  );
}

function DefinitionRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--gray-100)" }}>
      <div style={{ minWidth: 180, fontSize: 12, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--gray-800)" }}>{value}</div>
    </div>
  );
}

// ===== Version History =====

function VersionHistory({ indicator, allIndicators }) {
  // Build version chain: current + all ancestors
  const chain = useMemo(() => {
    const items = [];
    let current = indicator;
    const seen = new Set();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      items.push(current);
      if (current.parent_id) {
        current = allIndicators.find((i) => i.id === current.parent_id);
      } else {
        break;
      }
    }
    return items;
  }, [indicator, allIndicators]);

  if (chain.length <= 1) {
    return (
      <div style={{ padding: "16px", fontSize: 13, color: "var(--gray-500)" }}>
        No previous versions — this is the original definition.
      </div>
    );
  }

  return (
    <div>
      {chain.map((v, i) => (
        <div key={v.id} style={{
          display: "flex", gap: 12, padding: "12px 16px",
          borderBottom: i < chain.length - 1 ? "1px solid var(--gray-100)" : "none",
          background: i === 0 ? "var(--green-50)" : "#fff"
        }}>
          <div style={{
            minWidth: 28, height: 28, borderRadius: "50%",
            background: i === 0 ? "var(--green-600)" : "var(--gray-200)",
            color: i === 0 ? "#fff" : "var(--gray-600)",
            display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, flexShrink: 0
          }}>
            v{v.version}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: i === 0 ? 700 : 500, fontSize: 13 }}>
              {v.name}
              {i === 0 && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--green-700)", fontWeight: 600 }}>Current</span>}
            </div>
            {v.description && (
              <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{v.description}</div>
            )}
            <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 4 }}>
              Status: {v.status} · Target: {v.target} · {v.unit ?? "count"}
            </div>
          </div>
          {i > 0 && (
            <Link to={`/indicators/${v.id}`} style={{ fontSize: 11, color: "var(--purple-600)", fontWeight: 600, alignSelf: "center" }}>
              View →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

// ===== Disaggregation Panel =====

function DisaggregationPanel({ indicatorId, disaggData }) {
  const myData = disaggData.filter((d) => d.indicator_id === indicatorId);
  if (!myData.length) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: "var(--gray-500)" }}>
        No disaggregation data recorded for this indicator yet.
      </div>
    );
  }

  // Group by dimension
  const byDimension = {};
  for (const row of myData) {
    if (!byDimension[row.dimension]) byDimension[row.dimension] = [];
    byDimension[row.dimension].push(row);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {Object.entries(byDimension).map(([dimension, rows]) => (
        <div key={dimension}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--gray-500)", marginBottom: 8 }}>
            {dimension}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {rows.map((row) => (
              <div key={row.id} style={{
                padding: "8px 14px", borderRadius: 8, background: "var(--gray-50)",
                border: "1px solid var(--gray-200)", minWidth: 100, textAlign: "center"
              }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{row.value ?? "—"}</div>
                <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{row.category}</div>
                {row.percentage != null && (
                  <div style={{ fontSize: 11, color: "var(--purple-600)", marginTop: 2 }}>{row.percentage}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== Main Page =====

export default function IndicatorDetailPage() {
  const { id } = useParams();
  const { loading, error, governedIndicators, indicatorResults, indicatorApprovals, indicatorDisaggregation, assets } = useMELData();

  if (loading) return <PageLoading title="Loading indicator" description="Fetching indicator details and history." />;
  if (error) return <PageError title="Could not load indicator" message={error} />;

  const indicator = governedIndicators.find((i) => i.id === id);

  if (!indicator) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow="Indicator" title="Not found" description="" />
        <div className="card">
          <EmptyPanel
            title="Indicator not found"
            text="This indicator may have been removed or the ID is incorrect."
            actions={[{ label: "Back to indicators", to: "/indicators" }]}
          />
        </div>
      </div>
    );
  }

  // Results for this indicator
  const myResults = indicatorResults
    .filter((r) => r.indicator_id === id)
    .sort((a, b) => (a.period > b.period ? 1 : -1));

  // Approval history
  const myApprovals = indicatorApprovals
    .filter((a) => a.indicator_id === id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Trend chart data
  const trendData = myResults.map((r) => ({
    period: r.period,
    actual: r.value,
    target: r.target,
    performance: r.performance
  }));

  // Latest result
  const latest = myResults[myResults.length - 1];

  const domain = MEL_DOMAINS.find((d) => d.key === indicator.domain);
  const assetName = assets.find((a) => a.id === indicator.asset_id)?.name;

  const statusClsMap = {
    draft: "badge-gray",
    submitted: "badge-purple",
    approved: "badge-green",
    active: "badge-green",
    deprecated: "badge-red"
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Indicator detail"
        title={indicator.name}
        description={indicator.description ?? ""}
        meta={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {indicator.code && (
              <span className="badge badge-purple">{indicator.code}</span>
            )}
            <span className={`badge ${statusClsMap[indicator.status] ?? "badge-gray"}`}>
              <span className="badge-dot" />
              {indicator.status}
            </span>
            <Link to="/indicators" style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 500 }}>
              ← All indicators
            </Link>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="card card-body" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Latest value</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
            {latest?.value ?? "—"}
            {indicator.unit && <span style={{ fontSize: 14, fontWeight: 500, color: "var(--gray-500)", marginLeft: 4 }}>{indicator.unit}</span>}
          </div>
        </div>
        <div className="card card-body" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Target</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
            {indicator.target ?? "—"}
            {indicator.unit && <span style={{ fontSize: 14, fontWeight: 500, color: "var(--gray-500)", marginLeft: 4 }}>{indicator.unit}</span>}
          </div>
        </div>
        <div className="card card-body" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Performance</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: statusColors[getStatus(latest?.performance)] }}>
            {latest?.performance != null ? `${latest.performance}%` : "—"}
          </div>
        </div>
        <div className="card card-body" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</div>
          <div style={{ marginTop: 8 }}>
            <StatusBadge performance={latest?.performance} />
          </div>
          {latest?.data_coverage != null && (
            <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 6 }}>
              {latest.data_coverage}% data coverage
            </div>
          )}
        </div>
      </div>

      {/* Trend chart */}
      {trendData.length > 0 ? (
        <ChartCard
          title="Performance trend"
          description="Actual vs target over reported periods. The dashed line marks the 90% on-track threshold."
          footer="Performance = (actual ÷ target) × 100."
        >
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v, name) => [v != null ? (name === "performance" ? `${v}%` : v) : "—", name]}
                />
                <ReferenceLine y={indicator.target} stroke="var(--gray-400)" strokeDasharray="4 4" label={{ value: "Target", position: "right", fontSize: 10 }} />
                <ReferenceLine y={90} stroke="var(--green-400)" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="var(--purple-500)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="target" name="Target" stroke="var(--gray-400)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      ) : (
        <div className="card">
          <EmptyPanel title="No trend data" text="This indicator hasn't produced results yet. Run the indicator engine after adding data." />
        </div>
      )}

      <div className="two-column-grid">
        {/* Definition */}
        <SectionContainer title="Definition" description="Full indicator specification.">
          <div className="card">
            <div className="card-body">
              <DefinitionRow label="Name" value={indicator.name} />
              <DefinitionRow label="Code" value={indicator.code} />
              <DefinitionRow label="Description" value={indicator.description} />
              <DefinitionRow label="Domain" value={domain?.label ?? indicator.domain} />
              <DefinitionRow label="Asset" value={assetName} />
              <DefinitionRow label="Data source" value={indicator.data_source?.replace(/_/g, " ")} />
              <DefinitionRow label="Calculation" value={indicator.calculation} />
              <DefinitionRow label="Aggregation" value={indicator.aggregation} />
              <DefinitionRow label="Target" value={indicator.target != null ? `${indicator.target} ${indicator.unit ?? ""}`.trim() : null} />
              <DefinitionRow label="Weight" value={indicator.weight} />
              <DefinitionRow label="Numerator fields" value={indicator.numerator_fields?.join(", ")} />
              {indicator.denominator_fields?.length > 0 && (
                <DefinitionRow label="Denominator fields" value={indicator.denominator_fields.join(", ")} />
              )}
              <DefinitionRow label="Version" value={indicator.version} />
              <DefinitionRow label="Status" value={indicator.status} />
              <DefinitionRow label="Approved by" value={indicator.approved_by_name} />
            </div>
          </div>
        </SectionContainer>

        {/* Approval history */}
        <SectionContainer title="Approval history" description="Governance trail for this indicator.">
          <div className="card">
            <div className="card-body flush">
              {myApprovals.length === 0 ? (
                <div style={{ padding: 16, fontSize: 13, color: "var(--gray-500)" }}>No governance actions recorded.</div>
              ) : (
                <div>
                  {myApprovals.map((a, i) => (
                    <div key={a.id} style={{
                      padding: "12px 16px",
                      borderBottom: i < myApprovals.length - 1 ? "1px solid var(--gray-100)" : "none",
                      display: "flex", alignItems: "flex-start", gap: 12
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                        background: a.action === "approved" ? "var(--green-500)" : a.action === "rejected" ? "var(--red-500)" : "var(--gray-400)"
                      }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>
                          {a.action}
                          {a.from_status && (
                            <span style={{ fontWeight: 400, color: "var(--gray-500)", fontSize: 12 }}>
                              {" "}({a.from_status} → {a.to_status})
                            </span>
                          )}
                        </div>
                        {a.reason && (
                          <div style={{ fontSize: 12, color: "var(--gray-600)", marginTop: 2 }}>{a.reason}</div>
                        )}
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 2 }}>
                          {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionContainer>
      </div>

      {/* Version history */}
      <SectionContainer title="Version history" description="Previous definitions of this indicator. Definitions are never overwritten — each change creates a new version.">
        <div className="card">
          <div className="card-body flush">
            <VersionHistory indicator={indicator} allIndicators={governedIndicators} />
          </div>
        </div>
      </SectionContainer>

      {/* Disaggregation */}
      <SectionContainer title="Disaggregation" description="Breakdown of results by gender, location, age group, and other dimensions.">
        <div className="card">
          <div className="card-body">
            <DisaggregationPanel indicatorId={id} disaggData={indicatorDisaggregation} />
          </div>
        </div>
      </SectionContainer>

      {/* Result history table */}
      {myResults.length > 0 && (
        <SectionContainer title="Result history" description="All computed results for this indicator across periods.">
          <div className="card">
            <div className="card-body flush">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Value</th>
                      <th>Target</th>
                      <th>Performance</th>
                      <th>Status</th>
                      <th>Data points</th>
                      <th>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...myResults].reverse().map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.period}</td>
                        <td>{r.value ?? "—"}</td>
                        <td>{r.target ?? "—"}</td>
                        <td style={{ fontWeight: 700, color: statusColors[getStatus(r.performance)] }}>
                          {r.performance != null ? `${r.performance}%` : "—"}
                        </td>
                        <td><StatusBadge performance={r.performance} /></td>
                        <td>{r.data_points_used ?? "—"}</td>
                        <td style={{ color: r.data_coverage >= 80 ? "var(--green-600)" : r.data_coverage >= 50 ? "var(--amber-500)" : "var(--red-500)" }}>
                          {r.data_coverage != null ? `${r.data_coverage}%` : "—"}
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
    </div>
  );
}
