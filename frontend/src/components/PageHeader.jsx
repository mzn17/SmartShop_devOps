export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="d-flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
