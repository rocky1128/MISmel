import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import useMELData from "../hooks/useMELData";
import { aggregateMetrics } from "../lib/scoreUtils";

const PLATFORMS = ["facebook", "youtube", "tiktok", "linkedin"];
const PCOLORS = { facebook: "#1877F2", youtube: "#FF0000", tiktok: "#010101", linkedin: "#0A66C2" };
const PLABELS = { facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok", linkedin: "LinkedIn" };
const METRICS = ["views", "unique_reach", "watch_time_min", "completion_rate", "engagement_rate", "cta_clicks", "shares", "new_followers"];
const MLABELS = { views: "Views", unique_reach: "Unique Reach", watch_time_min: "Watch Time (min)", completion_rate: "Completion Rate (%)", engagement_rate: "Engagement Rate (%)", cta_clicks: "CTA Clicks", shares: "Shares / Saves", new_followers: "New Followers" };

export default function MediaAnalytics() {
  const { assets, metrics, loading } = useMELData();
  const [selectedAsset, setSelectedAsset] = useState("");

  const filtered = useMemo(() => selectedAsset ? metrics.filter(m => m.assetId === selectedAsset) : metrics, [metrics, selectedAsset]);
  const bySource = useMemo(() => aggregateMetrics(filtered, "source"), [filtered]);
  const totals = useMemo(() => { const t = {}; for (const m of filtered) { t[m.name] = (t[m.name] || 0) + m.value; } return t; }, [filtered]);

  const chartData = useMemo(() =>
    PLATFORMS.map(p => ({ name: PLABELS[p], views: bySource[p]?.views || 0, reach: bySource[p]?.unique_reach || 0 })),
    [bySource]
  );

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--gray-400)" }}>Loading...</div>;

  const mediaAssets = assets.filter(a => a.type === "media");

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Performance</div>
            <h1 className="page-title">Media Analytics</h1>
            <p className="page-subtitle">Platform performance breakdown across Facebook, YouTube, TikTok, and LinkedIn.</p>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <select className="filter-select" value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)}>
          <option value="">All Media Assets</option>
          {mediaAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {metrics.length === 0 ? (
        <div className="card"><div className="empty-state"><BarChart3 size={40} className="empty-state-icon" /><div className="empty-state-title">No media metrics</div><div className="empty-state-text">Upload metrics data via Data Entry to see platform analytics.</div></div></div>
      ) : (
        <>
          <div className="metrics-grid" style={{ marginBottom: 20 }}>
            <MC label="Total Views" value={(totals.views || 0).toLocaleString()} sub="Across all platforms" />
            <MC label="Total Reach" value={(totals.unique_reach || 0).toLocaleString()} sub="Unique audience" />
            <MC label="Watch Time" value={(totals.watch_time_min || 0).toLocaleString()} sub="Minutes watched" />
            <MC label="New Followers" value={(totals.new_followers || 0).toLocaleString()} sub="Audience growth" />
          </div>

          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Views by Platform</h3></div>
              <div className="card-body">
                <div style={{ width: "100%", height: 260 }}>
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
              <div className="card-header"><h3 className="card-title">Platform Share</h3></div>
              <div className="card-body">
                <div className="stack" style={{ gap: 14 }}>
                  {PLATFORMS.map(p => {
                    const v = bySource[p]?.views || 0;
                    const max = Math.max(...PLATFORMS.map(pp => bySource[pp]?.views || 0), 1);
                    return (
                      <div key={p}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                          <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: PCOLORS[p] }} />
                            {PLABELS[p]}
                          </span>
                          <span style={{ fontWeight: 700 }}>{v.toLocaleString()}</span>
                        </div>
                        <div className="progress-bar" style={{ height: 10 }}>
                          <div style={{ height: "100%", width: `${(v / max) * 100}%`, background: PCOLORS[p], borderRadius: 100, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3 className="card-title">Platform Comparison</h3></div>
            <div className="card-body flush">
              <div className="table-container">
                <table>
                  <thead><tr><th>Metric</th>{PLATFORMS.map(p => <th key={p}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: PCOLORS[p] }} />{PLABELS[p]}</span></th>)}<th>Total</th></tr></thead>
                  <tbody>
                    {METRICS.map(m => {
                      const isRate = m.includes("rate");
                      return (
                        <tr key={m}>
                          <td style={{ fontWeight: 600 }}>{MLABELS[m]}</td>
                          {PLATFORMS.map(p => <td key={p}>{fmt(bySource[p]?.[m] || 0, isRate)}</td>)}
                          <td style={{ fontWeight: 700 }}>{fmt(totals[m] || 0, isRate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {!selectedAsset && mediaAssets.length > 1 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Asset Comparison</h3></div>
              <div className="card-body flush">
                <div className="table-container">
                  <table>
                    <thead><tr><th>Asset</th><th>Views</th><th>Reach</th><th>Watch Time</th><th>Engagement</th><th>Followers</th></tr></thead>
                    <tbody>
                      {mediaAssets.map(a => {
                        const am = metrics.filter(m => m.assetId === a.id);
                        const agg = {}; for (const m of am) agg[m.name] = (agg[m.name] || 0) + m.value;
                        return (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 600 }}>{a.name}</td>
                            <td>{(agg.views || 0).toLocaleString()}</td>
                            <td>{(agg.unique_reach || 0).toLocaleString()}</td>
                            <td>{(agg.watch_time_min || 0).toLocaleString()}</td>
                            <td>{(agg.engagement_rate || 0).toFixed(1)}%</td>
                            <td>{(agg.new_followers || 0).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MC({ label, value, sub }) {
  return (
    <div className="card metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      <div style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function fmt(v, isRate) { return isRate ? v.toFixed(1) : v.toLocaleString(); }
