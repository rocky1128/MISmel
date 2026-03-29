import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export default function KPICard({ label, value, trend = null, tone = "good", caption }) {
  const hasTrend = trend !== null && trend !== undefined;
  const direction = trend > 0 ? "positive" : trend < 0 ? "negative" : "neutral";

  return (
    <div className={`kpi-card ${tone}`}>
      <div className="kpi-card-label">{label}</div>
      <div className="kpi-card-value">{value}</div>
      {hasTrend ? (
        <div className={`kpi-card-trend ${direction}`}>
          {direction === "positive" ? <ArrowUpRight size={14} /> : null}
          {direction === "negative" ? <ArrowDownRight size={14} /> : null}
          {direction === "neutral" ? <Minus size={14} /> : null}
          <span>{direction === "neutral" ? "Stable" : `${Math.abs(trend)}%`}</span>
        </div>
      ) : null}
      {caption ? <div className="kpi-card-caption">{caption}</div> : null}
    </div>
  );
}
