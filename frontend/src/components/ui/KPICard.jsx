import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function KPICard({ label, value, trend = 0, tone = "good", caption }) {
  const positive = trend >= 0;

  return (
    <div className={`kpi-card ${tone}`}>
      <div className="kpi-card-label">{label}</div>
      <div className="kpi-card-value">{value}</div>
      <div className={`kpi-card-trend ${positive ? "positive" : "negative"}`}>
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        <span>{Math.abs(trend)}%</span>
      </div>
      {caption ? <div className="kpi-card-caption">{caption}</div> : null}
    </div>
  );
}
