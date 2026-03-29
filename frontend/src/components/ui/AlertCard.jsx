export default function AlertCard({ title, detail, tone = "warning" }) {
  return (
    <div className={`alert-card ${tone}`}>
      <div className="alert-card-title">{title}</div>
      <div className="alert-card-text">{detail}</div>
    </div>
  );
}
