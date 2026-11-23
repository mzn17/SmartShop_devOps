export default function StatCard({ label, value, icon, iconBg = '#ccfbf1', iconColor = '#0f766e', trend, trendLabel }) {
  return (
    <div className="stat-card">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value mt-1">{value}</div>
        </div>
        <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
          <i className={`bi ${icon}`} />
        </div>
      </div>
      {trend || trendLabel ? (
        <div className="d-flex align-items-center gap-2 fs-12">
          {trend ? (
            <span className={`stat-trend ${trend.startsWith('-') ? 'text-danger' : 'text-success'}`}>
              <i className={`bi ${trend.startsWith('-') ? 'bi-arrow-down-right' : 'bi-arrow-up-right'}`} /> {trend}
            </span>
          ) : null}
          {trendLabel ? <span className="text-muted-soft">{trendLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
