import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { user } = useAuth();
  const home = !user ? '/login' : user.role === 'caissier' ? '/cashier/pos' : '/admin/dashboard';

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-4 bg-white">
      <div className="text-center" style={{ maxWidth: 420 }}>
        <div className="stat-icon mx-auto mb-3" style={{ width: 64, height: 64, fontSize: '1.7rem', background: '#ccfbf1', color: '#0f766e' }}>
          <i className="bi bi-compass" />
        </div>
        <h1 className="fw-800 mb-2">Page introuvable</h1>
        <p className="text-muted fs-13">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link to={home} className="btn btn-brand mt-2">
          <i className="bi bi-house me-1" /> Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
