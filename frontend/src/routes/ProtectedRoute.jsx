import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protège les routes selon la connexion et le rôle.
 * Redirige vers /login si non connecté, ou vers l'espace du rôle sinon.
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-brand" role="status">
          <span className="visually-hidden">Chargement…</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    const fallback = user.role === 'caissier' ? '/cashier/pos' : '/admin/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
