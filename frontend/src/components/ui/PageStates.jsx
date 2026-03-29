import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

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

export function EmptyPanel({ icon: Icon, title, text, actions = [], children }) {
  return (
    <div className="empty-state">
      {Icon ? <Icon size={40} className="empty-state-icon" /> : null}
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-text">{text}</div>
      {actions.length ? (
        <div className="empty-state-actions">
          {actions.map((action) => {
            const className = action.variant === "secondary" ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm";
            if (action.to) {
              return (
                <Link key={`${action.label}-${action.to}`} to={action.to} className={className}>
                  {action.label}
                </Link>
              );
            }
            if (action.href) {
              return (
                <a key={`${action.label}-${action.href}`} href={action.href} className={className}>
                  {action.label}
                </a>
              );
            }
            return (
              <button key={action.label} type="button" className={className} onClick={action.onClick}>
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {children}
    </div>
  );
}
