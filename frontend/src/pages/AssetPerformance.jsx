import { useMemo, useState } from "react";
import { Building2, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useMELData from "../hooks/useMELData";
import { aggregateMetrics, calculatePerformance, getBadgeClass, getPerformanceLabel, getPerformanceStatus } from "../lib/scoreUtils";
import { EmptyPanel, PageLoading } from "../components/ui/PageStates";

export default function AssetPerformance() {
  const { assets, metrics, indicators, loading } = useMELData();
  const [selected, setSelected] = useState("");

  const byAsset = useMemo(() => aggregateMetrics(metrics, "assetId"), [metrics]);

  const assetIndicators = useMemo(
    () => (selected ? indicators.filter((indicator) => indicator.assetId === selected) : indicators.filter((indicator) => indicator.assetId)),
    [indicators, selected]
  );

  const chartData = useMemo(
    () =>
      assets
        .filter((asset) => asset.type === "media")
        .map((asset) => ({
          name: asset.name,
          views: byAsset[asset.id]?.views || 0,
          reach: byAsset[asset.id]?.unique_reach || 0
        })),
    [assets, byAsset]
  );

  const summary = useMemo(
    () => ({
      assets: assets.length,
      linkedIndicators: indicators.filter((indicator) => indicator.assetId).length,
      trackedMetrics: metrics.length,
      selectedLabel: selected ? assets.find((asset) => asset.id === selected)?.name || "Selected asset" : "All assets"
    }),
    [assets, indicators, metrics.length, selected]
  );

  if (loading) {
    return (
      <PageLoading
        title="Loading asset performance"
        description="Aggregating asset metrics and linked indicator results for comparison."
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Performance</div>
            <h1 className="page-title">Asset Performance</h1>
            <p className="page-subtitle">
              Compare institutional assets using aggregated metrics and the indicators attached to each one.
            </p>
          </div>
        </div>
      </div>

      <div className="summary-strip">
        <SummaryTile label="Total Assets" value={summary.assets} text="Configured assets in the workspace" />
        <SummaryTile label="Linked Indicators" value={summary.linkedIndicators} text="Indicators connected to assets" />
        <SummaryTile label="Tracked Metrics" value={summary.trackedMetrics} text="Raw metric rows available for analysis" />
        <SummaryTile label="Current Focus" value={summary.selectedLabel} text="Use the filter to narrow the view" />
      </div>

      <div className="toolbar">
        <select className="filter-select" value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="">All Assets</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name}
            </option>
          ))}
        </select>
        <div className="toolbar-spacer" />
        <span className="toolbar-note">{assetIndicators.length} linked indicators in view</span>
      </div>

      {assets.length === 0 ? (
        <div className="card">
          <EmptyPanel
            icon={Building2}
            title="No assets configured"
            text="Add assets in the database before this performance view can compare them."
          />
        </div>
      ) : (
        <>
          <div className="metrics-grid">
            {assets.map((asset) => {
              const aggregate = byAsset[asset.id] || {};
              const isActive = !selected || selected === asset.id;
              return (
                <div
                  key={asset.id}
                  className="card metric-card"
                  onClick={() => setSelected(selected === asset.id ? "" : asset.id)}
                  style={{ cursor: "pointer", opacity: isActive ? 1 : 0.48, transition: "opacity 0.2s" }}
                >
                  <div className="metric-card-top">
                    <div className="metric-icon green"><Building2 size={16} /></div>
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>{cap(asset.type)}</span>
                  </div>
                  <div className="metric-value">{(aggregate.views || 0).toLocaleString()}</div>
                  <div className="metric-label">{asset.name}</div>
                  <div className="metric-subtext">{(aggregate.unique_reach || 0).toLocaleString()} reach</div>
                </div>
              );
            })}
          </div>

          {chartData.some((item) => item.views > 0) ? (
            <div className="card">
              <div className="card-header">
                <div className="section-copy">
                  <div className="section-title">Views and Reach by Asset</div>
                  <div className="section-text">
                    Compare top-line media output across the asset portfolio.
                  </div>
                </div>
                <TrendingUp size={16} style={{ color: "var(--gray-400)" }} />
              </div>
              <div className="card-body">
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F5" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="views" fill="var(--purple-500)" name="Views" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="reach" fill="var(--green-500)" name="Reach" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : null}

          <div className="card">
            <div className="card-header">
              <div className="section-copy">
                <div className="section-title">Linked Indicator Performance</div>
                <div className="section-text">
                  See how indicators attached to assets are pacing against their targets.
                </div>
              </div>
            </div>
            <div className="card-body flush">
              {assetIndicators.length ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Indicator</th>
                        <th>Asset</th>
                        <th>Target</th>
                        <th>Actual</th>
                        <th>Performance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetIndicators.map((indicator) => {
                        const performance = calculatePerformance(indicator.actual, indicator.target);
                        const status = getPerformanceStatus(performance);
                        return (
                          <tr key={indicator.id}>
                            <td style={{ fontWeight: 700, color: "var(--purple-700)" }}>{indicator.code}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{indicator.name}</div>
                              {indicator.indicatorType ? <div className="table-detail">{cap(indicator.indicatorType)}</div> : null}
                            </td>
                            <td><span className="badge badge-gray">{indicator.assetName}</span></td>
                            <td>{formatValue(indicator.target)}</td>
                            <td style={{ fontWeight: 700 }}>{formatValue(indicator.actual)}</td>
                            <td>
                              <div className="dashboard-value-inline">
                                <div className="progress-bar" style={{ width: 72 }}>
                                  <div
                                    className={`progress-fill ${status}`}
                                    style={{ width: `${Math.min(performance, 100)}%` }}
                                  />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700 }}>{performance}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${getBadgeClass(status)}`}>
                                <span className="badge-dot" />
                                {getPerformanceLabel(performance)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyPanel
                  title="No linked indicators in this view"
                  text={`There are no indicators linked to ${selected ? "the selected asset" : "the current asset set"}.`}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value, text }) {
  return (
    <div className="summary-tile">
      <div className="summary-tile-label">{label}</div>
      <div className="summary-tile-value">{value}</div>
      <div className="summary-tile-text">{text}</div>
    </div>
  );
}

function cap(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function formatValue(value) {
  return value === null || value === undefined || value === "" ? "--" : value;
}
