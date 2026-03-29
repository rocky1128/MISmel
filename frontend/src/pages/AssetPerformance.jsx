import { useMemo, useState } from "react";
import { Building2, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import useMELData from "../hooks/useMELData";
import { calculatePerformance, getPerformanceStatus, getPerformanceLabel, getBadgeClass, aggregateMetrics } from "../lib/scoreUtils";

export default function AssetPerformance() {
  const { assets, metrics, indicators, loading } = useMELData();
  const [selected, setSelected] = useState("");

  const byAsset = useMemo(() => aggregateMetrics(metrics, "assetId"), [metrics]);

  const assetInds = useMemo(() =>
    selected ? indicators.filter(i => i.assetId === selected) : indicators.filter(i => i.assetId),
    [indicators, selected]
  );

  const chartData = useMemo(() => {
    return assets.filter(a => a.type === "media").map(a => ({
      name: a.name,
      views: byAsset[a.id]?.views || 0,
      reach: byAsset[a.id]?.unique_reach || 0
    }));
  }, [assets, byAsset]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--gray-400)" }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Performance</div>
            <h1 className="page-title">Asset Performance</h1>
            <p className="page-subtitle">Track performance of institutional assets with aggregated metrics and indicator results.</p>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <select className="filter-select" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">All Assets</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="toolbar-spacer" />
        <span style={{ fontSize: 13, color: "var(--gray-500)" }}>{assets.length} assets</span>
      </div>

      {assets.length === 0 ? (
        <div className="card"><div className="empty-state"><Building2 size={40} className="empty-state-icon" /><div className="empty-state-title">No assets configured</div><div className="empty-state-text">Add assets to the database to track their performance.</div></div></div>
      ) : (
        <>
          <div className="metrics-grid" style={{ marginBottom: 20 }}>
            {assets.map(a => {
              const agg = byAsset[a.id] || {};
              const isActive = !selected || selected === a.id;
              return (
                <div key={a.id} className="card metric-card" onClick={() => setSelected(selected === a.id ? "" : a.id)}
                  style={{ cursor: "pointer", opacity: isActive ? 1 : 0.45, transition: "opacity 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div className="metric-icon green"><Building2 size={16} /></div>
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>{cap(a.type)}</span>
                  </div>
                  <div className="metric-value">{(agg.views || 0).toLocaleString()}</div>
                  <div className="metric-label">{a.name}</div>
                  <div style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 4 }}>{(agg.unique_reach || 0).toLocaleString()} reach</div>
                </div>
              );
            })}
          </div>

          {chartData.some(d => d.views > 0) && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><h3 className="card-title">Views & Reach by Asset</h3><TrendingUp size={16} style={{ color: "var(--gray-400)" }} /></div>
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
          )}

          <div className="card">
            <div className="card-header"><h3 className="card-title">Linked Indicator Performance</h3></div>
            <div className="card-body flush">
              {assetInds.length ? (
                <div className="table-container">
                  <table>
                    <thead><tr><th>Code</th><th>Indicator</th><th>Asset</th><th>Target</th><th>Actual</th><th>Performance</th><th>Status</th></tr></thead>
                    <tbody>
                      {assetInds.map(i => {
                        const perf = calculatePerformance(i.actual, i.target);
                        const s = getPerformanceStatus(perf);
                        return (
                          <tr key={i.id}>
                            <td style={{ fontWeight: 600, color: "var(--purple-700)" }}>{i.code}</td>
                            <td>{i.name}</td>
                            <td><span className="badge badge-gray">{i.assetName}</span></td>
                            <td>{i.target}</td>
                            <td style={{ fontWeight: 600 }}>{i.actual ?? "—"}</td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div className="progress-bar" style={{ width: 60 }}><div className={`progress-fill ${s}`} style={{ width: `${Math.min(perf, 100)}%` }} /></div>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{perf}%</span>
                              </div>
                            </td>
                            <td><span className={`badge ${getBadgeClass(s)}`}><span className="badge-dot" />{getPerformanceLabel(perf)}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <div className="empty-state"><div className="empty-state-text">No indicators linked to {selected ? "this asset" : "any asset"}.</div></div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
