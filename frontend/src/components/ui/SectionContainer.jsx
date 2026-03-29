export default function SectionContainer({ title, description, actions, children }) {
  return (
    <section className="section-container">
      <div className="section-container-head">
        <div className="section-copy">
          <div className="section-title">{title}</div>
          {description ? <div className="section-text">{description}</div> : null}
        </div>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </div>
      <div className="section-container-body">{children}</div>
    </section>
  );
}
