export default function StatusBadge({ status, mapping, label }) {
  const meta = mapping?.[status] || { label: label || status, className: 'badge-soft-neutral' };
  return <span className={`badge-soft-${meta.className.replace('badge-soft-', '')}`}>{label || meta.label}</span>;
}
