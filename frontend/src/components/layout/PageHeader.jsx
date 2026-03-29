export default function PageHeader({ eyebrow, title, description, actions, meta }) {
  return (
    <header className="page-header">
      <div className="page-header-row">
        <div className="page-header-copy">
          {eyebrow ? <div className="page-breadcrumb">{eyebrow}</div> : null}
          <h1 className="page-title">{title}</h1>
          {description ? <p className="page-subtitle">{description}</p> : null}
        </div>
        <div className="page-actions">
          {meta}
          {actions}
        </div>
      </div>
    </header>
  );
}
