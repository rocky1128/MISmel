export default function ChartCard({ title, description, children, footer }) {
  return (
    <div className="chart-card">
      <div className="chart-card-head">
        <div className="section-copy">
          <div className="section-title">{title}</div>
          {description ? <div className="section-text">{description}</div> : null}
        </div>
      </div>
      <div className="chart-card-body">{children}</div>
      {footer ? <div className="chart-card-footer">{footer}</div> : null}
    </div>
  );
}
