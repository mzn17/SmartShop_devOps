import { useLocation } from 'react-router-dom';
import { getNavigation } from '../config/navigation';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../constants';
import { initials, todayLong } from '../utils/format';

export default function Topbar({ onMenu }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigation = getNavigation(user?.role);
  const allItems = navigation.flatMap((group) => group.items);
  const current = allItems.find((item) => location.pathname.startsWith(item.to));

  return (
    <header className="app-topbar">
      <button
        type="button"
        className="topbar-icon-btn d-lg-none"
        onClick={onMenu}
        aria-label="Ouvrir le menu"
      >
        <i className="bi bi-list fs-5" />
      </button>

      <div className="flex-grow-1 min-w-0">
        <div className="fs-12 text-muted-soft d-none d-sm-block">SmartStore / Espace {ROLE_LABELS[user?.role]}</div>
        <div className="fw-bold fs-6 text-truncate">{current?.label || 'SmartStore'}</div>
      </div>

      <div className="d-none d-md-flex align-items-center gap-2 text-muted fs-13">
        <i className="bi bi-calendar3 text-brand" />
        <span className="text-capitalize">{todayLong()}</span>
      </div>



      <div className="d-flex align-items-center gap-2 ps-2 border-start">
        <div className="sidebar-user-avatar" style={{ background: '#ccfbf1', color: '#0f766e' }}>
          {initials(user?.name)}
        </div>
        <div className="d-none d-sm-block lh-sm">
          <div className="fw-semibold fs-13">{user?.name}</div>
          <div className="text-muted-soft fs-12">{ROLE_LABELS[user?.role]}</div>
        </div>
      </div>
    </header>
  );
}
