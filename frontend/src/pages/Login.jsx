import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(user.role === 'caissier' ? '/cashier/pos' : '/admin/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (event) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loggedUser = await login(form);
      navigate(loggedUser.role === 'caissier' ? '/cashier/pos' : '/admin/dashboard', { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-visual">
        <div className="position-relative" style={{ zIndex: 1 }}>
          <div className="d-flex align-items-center gap-3 mb-5">
            <div className="sidebar-brand-icon" style={{ width: 48, height: 48 }}>
              <i className="bi bi-shop-window" />
            </div>
            <div>
              <div className="fw-800 fs-4 lh-1">SmartStore</div>
              <div className="text-white-50 fs-12 text-uppercase" style={{ letterSpacing: '0.16em' }}>
                Gestion de magasin
              </div>
            </div>
          </div>

          <div className="login-visual-content" style={{ maxWidth: 470 }}>
            <h1 className="fw-800 mb-3" style={{ fontSize: '2.35rem', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              Votre magasin, piloté de la caisse au stock.
            </h1>
            <p className="text-white-50 mb-4" style={{ fontSize: '0.95rem' }}>
              Une plateforme unique pour encaisser, facturer, suivre le stock et anticiper le
              réapprovisionnement.
            </p>

            <div className="login-feature">
              <div className="login-feature-icon"><i className="bi bi-upc-scan" /></div>
              <div>
                <div className="fw-semibold fs-13">Caisse rapide</div>
                <div className="text-white-50 fs-12">Scan du code-barres et total automatique.</div>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon"><i className="bi bi-box-seam" /></div>
              <div>
                <div className="fw-semibold fs-13">Stock en temps réel</div>
                <div className="text-white-50 fs-12">Mise à jour après chaque vente et chaque réception.</div>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon"><i className="bi bi-robot" /></div>
              <div>
                <div className="fw-semibold fs-13">Réapprovisionnement automatique</div>
                <div className="text-white-50 fs-12">Alerte à 16h et commande fournisseur générée.</div>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon"><i className="bi bi-bar-chart-line" /></div>
              <div>
                <div className="fw-semibold fs-13">Rapports BI</div>
                <div className="text-white-50 fs-12">Recettes espèces / carte et produits les plus vendus.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="position-relative text-white-50 fs-12" style={{ zIndex: 1 }}>
          Projet d'intégration — ISET Nabeul · 2026
        </div>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="d-lg-none d-flex align-items-center gap-2 mb-4">
            <div className="sidebar-brand-icon">
              <i className="bi bi-shop-window" />
            </div>
            <div className="fw-800 fs-5">SmartStore</div>
          </div>

          <h2 className="fw-800 mb-1" style={{ fontSize: '1.6rem' }}>Bon retour 👋</h2>
          <p className="text-muted fs-13 mb-4">Connectez-vous pour accéder à votre espace de travail.</p>

          {error ? (
            <div className="alert alert-danger py-2 fs-13 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-circle" />
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Adresse email</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0" style={{ borderRadius: '10px 0 0 10px' }}>
                  <i className="bi bi-envelope text-muted" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control border-start-0"
                  placeholder="vous@smartstore.tn"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  style={{ borderRadius: '0 10px 10px 0' }}
                />
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">Mot de passe</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0" style={{ borderRadius: '10px 0 0 10px' }}>
                  <i className="bi bi-lock text-muted" />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control border-start-0 border-end-0"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-group-text bg-white border-start-0"
                  onClick={() => setShowPassword((value) => !value)}
                  style={{ borderRadius: '0 10px 10px 0' }}
                  aria-label="Afficher le mot de passe"
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-muted`} />
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-brand w-100 py-2 mt-2" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" /> Connexion…
                </>
              ) : (
                <>
                  Se connecter <i className="bi bi-arrow-right ms-1" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-muted-soft fs-12 mt-4 mb-0">
            © 2026 SmartStore · Gestion de stock, caisse & facturation
          </p>
        </div>
      </section>
    </div>
  );
}
