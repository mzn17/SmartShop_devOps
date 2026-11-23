import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNavigation } from '../config/navigation';
import { ROLE_LABELS } from '../constants';
import { initials } from '../utils/format';

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navigation = getNavigation(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`app-sidebar ${open ? 'show' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <i className="bi bi-shop-window" />
        </div>
        <div>
          <div className="sidebar-brand-name">SmartStore</div>
          <div className="sidebar-brand-sub">Gestion de magasin</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navigation.map((group) => (
          <div key={group.section}>
            <div className="sidebar-section">{group.section}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <i className={`bi ${item.icon}`} />
                <span>{item.label}</span>
                {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials(user?.name)}</div>
          <div className="flex-grow-1 min-w-0">
            <div className="sidebar-user-name text-truncate">{user?.name}</div>
            <div className="sidebar-user-role">{ROLE_LABELS[user?.role] || 'Utilisateur'}</div>
          </div>
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            title="Se déconnecter"
          >
            <i className="bi bi-box-arrow-right fs-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
