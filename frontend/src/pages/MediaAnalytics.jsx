import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useMELData from "../hooks/useMELData";
import { aggregateMetrics } from "../lib/scoreUtils";
import { EmptyPanel, PageLoading } from "../components/ui/PageStates";

const PLATFORMS = ["facebook", "youtube", "tiktok", "linkedin"];
const PLATFORM_COLORS = { facebook: "#1877F2", youtube: "#FF0000", tiktok: "#010101", linkedin: "#0A66C2" };
const PLATFORM_LABELS = { facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok", linkedin: "LinkedIn" };
const METRICS = ["views", "unique_reach", "watch_time_min", "completion_rate", "engagement_rate", "cta_clicks", "shares", "new_followers"];
const METRIC_LABELS = {
  views: "Views",
  unique_reach: "Unique Reach",
  watch_time_min: "Watch Time (min)",
  completion_rate: "Completion Rate (%)",
  engagement_rate: "Engagement Rate (%)",
  cta_clicks: "CTA Clicks",
  shares: "Shares / Saves",
  new_followers: "New Followers"
};

export default function MediaAnalytics() {
  const { assets, metrics, loading } = useMELData();
  const [selectedAsset, setSelectedAsset] = useState("");

  const filtered = useMemo(
    () => (selectedAsset ? metrics.filter((metric) => metric.assetId === selectedAsset) : metrics),
    [metrics, selectedAsset]
  );
  const bySource = useMemo(() => aggregateMetrics(filtered, "source"), [filtered]);
  const totals = useMemo(() => {
    const nextTotals = {};
    for (const metric of filtered) {
      nextTotals[metric.name] = (nextTotals[metric.name] || 0) + metric.value;
    }
    return nextTotals;
  }, [filtered]);

  const chartData = useMemo(
    () =>
      PLATFORMS.map((platform) => ({
        name: PLATFORM_LABELS[platform],
        views: bySource[platform]?.views || 0,
        reach: bySource[platform]?.unique_reach || 0
      })),
    [bySource]
  );

  const mediaAssets = assets.filter((asset) => asset.type === "media");

  if (loading) {
    return (
      <PageLoading
        title="Loading media analytics"
        description="Aggregating media metrics across assets and distribution platforms."
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Performance</div>
            <h1 className="page-title">Media Analytics</h1>
            <p className="page-subtitle">
              Break down reach, views, watch time, and growth across Facebook, YouTube, TikTok, and LinkedIn.
            </p>
          </div>
        </div>
      </div>

      <div className="summary-strip">
        <SummaryTile label="Total Views" value={(totals.views || 0).toLocaleString()} text="Across the current media selection" />
        <SummaryTile label="Total Reach" value={(totals.unique_reach || 0).toLocaleString()} text="Unique audience reached so far" />
        <SummaryTile label="Watch Time" value={(totals.watch_time_min || 0).toLocaleString()} text="Minutes consumed across channels" />
        <SummaryTile label="New Followers" value={(totals.new_followers || 0).toLocaleString()} text="Audience growth from tracked content" />
      </div>

      <div className="toolbar">
        <select className="filter-select" value={selectedAsset} onChange={(event) => setSelectedAsset(event.target.value)}>
          <option value="">All Media Assets</option>
          {mediaAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name}
            </option>
          ))}
        </select>
        <div className="toolbar-spacer" />
        <span className="toolbar-note">{filtered.length} metric rows in view</span>
      </div>

      {metrics.length === 0 ? (
        <div className="card">
          <EmptyPanel
            icon={BarChart3}
            title="No media metrics available"
            text="Upload media metrics through Data Entry to activate this analytics view."
          />
        </div>
      ) : (
        <>
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <div className="section-copy">
                  <div className="section-title">Views by Platform</div>
                  <div className="section-text">
                    Compare total views and reach side by side across supported channels.
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div style={{ width: "100%", height: 280 }}>
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

            <div className="card">
              <div className="card-header">
                <div className="section-copy">
                  <div className="section-title">Platform Share</div>
                  <div className="section-text">
                    Relative platform contribution based on tracked view volume.
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="platform-list">
                  {PLATFORMS.map((platform) => {
                    const value = bySource[platform]?.views || 0;
                    const max = Math.max(...PLATFORMS.map((item) => bySource[item]?.views || 0), 1);
                    return (
                      <div key={platform}>
                        <div className="platform-row">
                          <span className="platform-chip">
                            <span className="platform-swatch" style={{ background: PLATFORM_COLORS[platform] }} />
                            {PLATFORM_LABELS[platform]}
                          </span>
                          <span style={{ fontWeight: 700 }}>{value.toLocaleString()}</span>
                        </div>
                        <div className="progress-bar" style={{ height: 10 }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${(value / max) * 100}%`,
                              background: PLATFORM_COLORS[platform],
                              borderRadius: 100,
                              transition: "width 0.4s"
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="section-copy">
                <div className="section-title">Platform Comparison</div>
                <div className="section-text">
                  Detailed metric comparison across all supported distribution platforms.
                </div>
              </div>
            </div>
            <div className="card-body flush">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {PLATFORMS.map((platform) => (
                        <th key={platform}>
                          <span className="platform-chip">
                            <span className="platform-swatch" style={{ background: PLATFORM_COLORS[platform] }} />
                            {PLATFORM_LABELS[platform]}
                          </span>
                        </th>
                      ))}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS.map((metric) => {
                      const isRate = metric.includes("rate");
                      return (
                        <tr key={metric}>
                          <td style={{ fontWeight: 700 }}>{METRIC_LABELS[metric]}</td>
                          {PLATFORMS.map((platform) => (
                            <td key={platform}>{formatMetric(bySource[platform]?.[metric] || 0, isRate)}</td>
                          ))}
                          <td style={{ fontWeight: 700 }}>{formatMetric(totals[metric] || 0, isRate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {!selectedAsset && mediaAssets.length > 1 ? (
            <div className="card">
              <div className="card-header">
                <div className="section-copy">
                  <div className="section-title">Asset Comparison</div>
                  <div className="section-text">
                    Compare aggregate media output across all tracked media assets.
                  </div>
                </div>
              </div>
              <div className="card-body flush">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Views</th>
                        <th>Reach</th>
                        <th>Watch Time</th>
                        <th>Engagement</th>
                        <th>Followers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mediaAssets.map((asset) => {
                        const assetMetrics = metrics.filter((metric) => metric.assetId === asset.id);
                        const aggregate = {};
                        for (const metric of assetMetrics) {
                          aggregate[metric.name] = (aggregate[metric.name] || 0) + metric.value;
                        }
                        return (
                          <tr key={asset.id}>
                            <td style={{ fontWeight: 700 }}>{asset.name}</td>
                            <td>{(aggregate.views || 0).toLocaleString()}</td>
                            <td>{(aggregate.unique_reach || 0).toLocaleString()}</td>
                            <td>{(aggregate.watch_time_min || 0).toLocaleString()}</td>
                            <td>{(aggregate.engagement_rate || 0).toFixed(1)}%</td>
                            <td>{(aggregate.new_followers || 0).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
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

function formatMetric(value, isRate) {
  return isRate ? value.toFixed(1) : value.toLocaleString();
}
