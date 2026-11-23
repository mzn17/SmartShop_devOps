import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { ROLE_LABELS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { userService } from '../../services/user.service';
import { formatDate, initials } from '../../utils/format';

const emptyForm = {
  name: '',
  email: '',
  role: 'caissier',
  active: true,
  password: '',
};

const roleBadge = {
  admin: 'badge-soft-info',
  gestionnaire: 'badge-soft-warning',
  caissier: 'badge-soft-success',
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await userService.list());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((item) => {
      const matchesSearch = !term || item.name.toLowerCase().includes(term) || item.email.toLowerCase().includes(term);
      const matchesRole = role === 'all' || item.role === role;
      return matchesSearch && matchesRole;
    });
  }, [users, search, role]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, email: item.email, role: item.role, active: item.active, password: '' });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      flash('Le nom et l’email sont obligatoires.');
      return;
    }
    if (!editing && form.password.length < 6) {
      flash('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      active: Boolean(form.active),
    };
    if (form.password) payload.password = form.password;

    setSaving(true);
    try {
      if (editing) {
        await userService.update(editing.id, payload);
        flash('Compte utilisateur mis à jour.');
      } else {
        await userService.create(payload);
        flash('Compte utilisateur créé.');
      }
      setShowModal(false);
      await loadUsers();
    } catch (saveError) {
      flash(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      await userService.update(item.id, { active: !item.active });
      flash(`Compte de ${item.name} ${item.active ? 'désactivé' : 'réactivé'}.`);
      await loadUsers();
    } catch (toggleError) {
      flash(getErrorMessage(toggleError));
    }
  };

  const handleDelete = async (item) => {
    if (item.email === user?.email) {
      flash('Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    if (!window.confirm(`Supprimer définitivement le compte de ${item.name} ?`)) return;

    try {
      await userService.remove(item.id);
      flash('Compte utilisateur supprimé.');
      await loadUsers();
    } catch (deleteError) {
      flash(getErrorMessage(deleteError));
    }
  };

  const activeCount = users.filter((item) => item.active).length;
  const cashierCount = users.filter((item) => item.role === 'caissier').length;

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        subtitle="Gérez les accès des administrateurs, gestionnaires et caissiers."
        actions={
          <button type="button" className="btn btn-brand" onClick={openCreate}>
            <i className="bi bi-person-plus me-1" /> Nouveau compte
          </button>
        }
      />

      {error ? <div className="alert alert-danger py-2 fs-13">{error}</div> : null}

      {notice ? (
        <div className="alert alert-success py-2 fs-13 d-flex justify-content-between align-items-center">
          <span><i className="bi bi-check-circle me-2" />{notice}</span>
          <button type="button" className="btn btn-sm btn-link text-success p-0" onClick={() => setNotice('')}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
      ) : null}

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Comptes</div>
            <div className="stat-value">{users.length}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Comptes actifs</div>
            <div className="stat-value text-success">{activeCount}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Caissiers</div>
            <div className="stat-value">{cashierCount}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Administrateurs</div>
            <div className="stat-value">{users.filter((item) => item.role === 'admin').length}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row g-2">
            <div className="col-12 col-lg-7">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0" style={{ borderRadius: '10px 0 0 10px' }}>
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  type="search"
                  className="form-control border-start-0"
                  placeholder="Rechercher par nom ou email…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  style={{ borderRadius: '0 10px 10px 0' }}
                />
              </div>
            </div>
            <div className="col-7 col-lg-3">
              <select className="form-select" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="all">Tous les rôles</option>
                <option value="admin">Administrateur</option>
                <option value="gestionnaire">Gestionnaire</option>
                <option value="caissier">Caissier</option>
              </select>
            </div>
            <div className="col-5 col-lg-2 text-lg-end align-self-center">
              <span className="text-muted fs-12">{filtered.length} compte(s)</span>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-modern align-middle">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <span className="spinner-border spinner-border-sm text-brand me-2" />
                    Chargement des comptes…
                  </td>
                </tr>
              ) : null}

              {!loading && filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="avatar-sm">{initials(item.name)}</div>
                      <div>
                        <div className="fw-semibold">{item.name}</div>
                        <div className="text-muted fs-12">ID #{String(item.id).slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted">{item.email}</td>
                  <td>
                    <span className={roleBadge[item.role]}>{ROLE_LABELS[item.role]}</span>
                  </td>
                  <td>
                    <span className={`badge-soft-${item.active ? 'success' : 'neutral'}`}>
                      <i className={`bi ${item.active ? 'bi-check-circle' : 'bi-slash-circle'} me-1`} />
                      {item.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="text-muted fs-13">{formatDate(item.createdAt)}</td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-1">
                      <button type="button" className="btn btn-soft btn-icon" title="Modifier" onClick={() => openEdit(item)}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-soft btn-icon"
                        title={item.active ? 'Désactiver' : 'Réactiver'}
                        onClick={() => toggleActive(item)}
                      >
                        <i className={`bi ${item.active ? 'bi-pause-circle' : 'bi-play-circle'}`} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-soft btn-icon text-danger"
                        title="Supprimer"
                        onClick={() => handleDelete(item)}
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 ? (
            <EmptyState icon="bi-people" title="Aucun compte trouvé" text="Modifiez la recherche ou créez un nouveau compte." />
          ) : null}
        </div>
      </div>

      {showModal ? (
        <Modal
          title={editing ? 'Modifier le compte' : 'Nouveau compte'}
          subtitle={editing ? editing.email : 'Créez un accès pour un employé du magasin.'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" form="user-form" className="btn btn-brand" disabled={saving}>
                <i className="bi bi-check-lg me-1" /> {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer le compte'}
              </button>
            </>
          }
        >
          <form id="user-form" onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label" htmlFor="user-name">Nom complet *</label>
                <input
                  id="user-name"
                  className="form-control"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Ex. Ines Ben Ali"
                  required
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="user-email">Adresse email *</label>
                <input
                  id="user-email"
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="employe@smartstore.tn"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="user-role">Rôle</label>
                <select
                  id="user-role"
                  className="form-select"
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                >
                  <option value="caissier">Caissier</option>
                  <option value="gestionnaire">Gestionnaire de stock</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="user-password">
                  {editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'}
                </label>
                <input
                  id="user-password"
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder={editing ? 'Laisser vide pour conserver' : '6 caractères minimum'}
                  required={!editing}
                />
              </div>
              <div className="col-12">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="user-active"
                    checked={form.active}
                    onChange={(event) => setForm({ ...form, active: event.target.checked })}
                  />
                  <label className="form-check-label fs-13" htmlFor="user-active">
                    Compte actif (peut se connecter)
                  </label>
                </div>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
