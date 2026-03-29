import { AlertTriangle } from "lucide-react";

export function PageLoading({
  title = "Loading page",
  description = "Pulling the latest workspace data for this view."
}) {
  return (
    <div className="state-panel state-panel-centered">
      <div className="spinner" />
      <h2 className="state-panel-title">{title}</h2>
      <p className="state-panel-text">{description}</p>
    </div>
  );
}

export function PageError({
  title = "This page could not load",
  description = "A data or configuration error prevented this view from rendering.",
  message
}) {
  return (
    <div className="state-panel">
      <div className="state-panel-row">
        <div className="state-panel-icon-wrap error">
          <AlertTriangle size={28} />
        </div>
        <div className="page-stack" style={{ gap: 10 }}>
          <h2 className="state-panel-title">{title}</h2>
          <p className="state-panel-text">{description}</p>
          {message ? <div className="state-panel-detail">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function EmptyPanel({ icon: Icon, title, text }) {
  return (
    <div className="empty-state">
      {Icon ? <Icon size={40} className="empty-state-icon" /> : null}
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-text">{text}</div>
    </div>
  );
}
