export default function InsightCard({ title, text, emphasis, tone = "good" }) {
  return (
    <div className={`insight-card ${tone}`}>
      <div className="insight-card-title">{title}</div>
      <div className="insight-card-text">{text}</div>
      {emphasis ? <div className="insight-card-emphasis">{emphasis}</div> : null}
    </div>
  );
}
