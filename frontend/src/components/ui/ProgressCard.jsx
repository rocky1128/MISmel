export default function ProgressCard({ title, score, trend = 0, tone = "good", meta }) {
  return (
    <div className="progress-card">
      <div className="progress-card-head">
        <div className="progress-card-title">{title}</div>
        <div className={`progress-card-pill ${tone}`}>{tone}</div>
      </div>
      <div className="progress-card-value">{score}%</div>
      <div className="progress-bar large">
        <div className={`progress-fill ${tone === "good" ? "green" : tone === "warning" ? "amber" : "red"}`} style={{ width: `${score}%` }} />
      </div>
      <div className="progress-card-meta">
        <span>{trend >= 0 ? "+" : ""}{trend}% trend</span>
        {meta ? <span>{meta}</span> : null}
      </div>
    </div>
  );
}
