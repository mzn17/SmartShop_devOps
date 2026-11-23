export default function EmptyState({ icon = 'bi-inbox', title = 'Aucun résultat', text }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon} d-block mb-2`} />
      <div className="fw-semibold text-dark">{title}</div>
      {text ? <div className="fs-13 mt-1">{text}</div> : null}
    </div>
  );
}
