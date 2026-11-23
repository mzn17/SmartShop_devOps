import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { categoryColor } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { categoryService } from '../../services/category.service';
import { productService } from '../../services/product.service';
import { supplierService } from '../../services/supplier.service';
import { formatMoney, initials, stockStatus } from '../../utils/format';

const blankForm = (categories, suppliers) => ({
  name: '',
  barcode: '',
  categoryId: categories[0]?.id || '',
  supplierId: suppliers[0]?.id || '',
  price: '',
  purchasePrice: '',
  stock: '',
  lowStockThreshold: 8,
});

export default function AdminProducts() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm([], []));
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [productList, categoryList, supplierList] = await Promise.all([
        productService.list(),
        categoryService.list(),
        supplierService.list(),
      ]);
      setProducts(productList);
      setCategories(categoryList);
      setSuppliers(supplierList);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.barcode.includes(term);
      const matchesCategory = category === 'all' || product.categoryId === category;
      const threshold = product.lowStockThreshold ?? 8;
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && product.stock < threshold) ||
        (stockFilter === 'out' && product.stock <= 0) ||
        (stockFilter === 'available' && product.stock >= threshold);
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, category, stockFilter]);

  const lowStockCount = products.filter(
    (product) => product.stock > 0 && product.stock < (product.lowStockThreshold ?? 8)
  ).length;
  const outOfStockCount = products.filter((product) => product.stock <= 0).length;
  const stockValue = products.reduce((total, product) => total + product.price * product.stock, 0);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm(categories, suppliers));
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      barcode: product.barcode,
      categoryId: product.categoryId || '',
      supplierId: product.supplierId || '',
      price: String(product.price),
      purchasePrice: String(product.purchasePrice ?? ''),
      stock: String(product.stock),
      lowStockThreshold: product.lowStockThreshold ?? 8,
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.barcode.trim() || form.price === '' || form.stock === '') {
      flash('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!form.categoryId) {
      flash('Sélectionnez une catégorie. Créez-en une dans MongoDB Compass si la liste est vide.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      category: form.categoryId,
      supplier: form.supplierId || null,
      price: Number(form.price),
      purchasePrice: Number(form.purchasePrice || 0),
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold || 8),
    };

    setSaving(true);
    try {
      if (editing) {
        await productService.update(editing.id, payload);
        flash('Produit modifié avec succès.');
      } else {
        await productService.create(payload);
        flash('Produit ajouté au catalogue.');
      }
      setShowModal(false);
      await loadData();
    } catch (saveError) {
      flash(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Supprimer le produit « ${product.name} » du catalogue ?`)) return;
    try {
      await productService.remove(product.id);
      flash('Produit retiré du catalogue.');
      await loadData();
    } catch (deleteError) {
      flash(getErrorMessage(deleteError));
    }
  };

  return (
    <>
      <PageHeader
        title="Produits"
        subtitle="Gérez le catalogue, les prix et les quantités disponibles."
        actions={
          <button type="button" className="btn btn-brand" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1" /> Nouveau produit
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
            <div className="stat-label">Références</div>
            <div className="stat-value">{products.length}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Valeur du stock</div>
            <div className="stat-value fs-5">{formatMoney(stockValue)}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Stock faible</div>
            <div className="stat-value text-warning">{lowStockCount}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">En rupture</div>
            <div className="stat-value text-danger">{outOfStockCount}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-lg-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0" style={{ borderRadius: '10px 0 0 10px' }}>
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  type="search"
                  className="form-control border-start-0"
                  placeholder="Rechercher par nom ou code-barres…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  style={{ borderRadius: '0 10px 10px 0' }}
                />
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <select className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">Toutes les catégories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-lg-3">
              <select className="form-select" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
                <option value="all">Tous les stocks</option>
                <option value="available">Disponible</option>
                <option value="low">Stock faible</option>
                <option value="out">Rupture</option>
              </select>
            </div>
            <div className="col-12 col-lg-1 text-lg-end">
              <span className="text-muted fs-12 fw-normal">{filtered.length} résultat(s)</span>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-modern align-middle">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Code-barres</th>
                <th>Catégorie</th>
                <th>Fournisseur</th>
                <th className="text-end">Prix</th>
                <th>Stock</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <span className="spinner-border spinner-border-sm text-brand me-2" />
                    Chargement des produits…
                  </td>
                </tr>
              ) : null}

              {!loading && filtered.map((product) => {
                const threshold = product.lowStockThreshold ?? 8;
                const status = stockStatus(product.stock, threshold);
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="product-avatar">{initials(product.name)}</div>
                        <div>
                          <div className="fw-semibold">{product.name}</div>
                          <div className="text-muted fs-12">Réf. #{String(product.id).slice(-6)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-monospace fs-12">{product.barcode}</td>
                    <td>
                      <span className={`badge-soft-${categoryColor(product.category)}`}>
                        {product.category || '—'}
                      </span>
                    </td>
                    <td className="text-muted">{product.supplier || '—'}</td>
                    <td className="text-end fw-semibold">{formatMoney(product.price)}</td>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        <span className={status.className}>{product.stock} pièces</span>
                        {product.stock < threshold ? (
                          <span className="fs-12 text-muted-soft">Seuil : {threshold}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-soft btn-icon"
                          title="Modifier"
                          onClick={() => openEdit(product)}
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        {isAdmin ? (
                          <button
                            type="button"
                            className="btn btn-soft btn-icon text-danger"
                            title="Supprimer"
                            onClick={() => handleDelete(product)}
                          >
                            <i className="bi bi-trash3" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && filtered.length === 0 ? (
            <EmptyState
              icon="bi-box-seam"
              title="Aucun produit trouvé"
              text="Modifiez vos filtres ou ajoutez un nouveau produit au catalogue."
            />
          ) : null}
        </div>
      </div>

      {showModal ? (
        <Modal
          title={editing ? 'Modifier le produit' : 'Nouveau produit'}
          subtitle={editing ? `Réf. #${String(editing.id).slice(-6)}` : 'Ajoutez une nouvelle référence au catalogue.'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button type="submit" form="product-form" className="btn btn-brand" disabled={saving}>
                <i className="bi bi-check-lg me-1" />
                {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter le produit'}
              </button>
            </>
          }
        >
          <form id="product-form" onSubmit={handleSubmit}>
            {!categories.length ? (
              <div className="alert alert-warning fs-12 py-2">
                <i className="bi bi-exclamation-triangle me-1" />
                Aucune catégorie en base. Créez une catégorie dans MongoDB Compass (collection
                <b> categories</b>) avant d'ajouter un produit.
              </div>
            ) : null}

            <div className="row g-3">
              <div className="col-12">
                <label className="form-label" htmlFor="product-name">Désignation *</label>
                <input
                  id="product-name"
                  className="form-control"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Ex. Eau minérale 1.5L"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="product-barcode">Code-barres *</label>
                <input
                  id="product-barcode"
                  className="form-control font-monospace"
                  value={form.barcode}
                  onChange={(event) => setForm({ ...form, barcode: event.target.value })}
                  placeholder="6191234500011"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="product-category">Catégorie</label>
                <select
                  id="product-category"
                  className="form-select"
                  value={form.categoryId}
                  onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                  required
                >
                  <option value="">Sélectionner…</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="product-price">Prix de vente (DT) *</label>
                <input
                  id="product-price"
                  type="number"
                  min="0"
                  step="0.001"
                  className="form-control"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  placeholder="0.700"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="product-purchase-price">Prix d’achat (DT)</label>
                <input
                  id="product-purchase-price"
                  type="number"
                  min="0"
                  step="0.001"
                  className="form-control"
                  value={form.purchasePrice}
                  onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })}
                  placeholder="0.450"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="product-stock">Quantité en stock *</label>
                <input
                  id="product-stock"
                  type="number"
                  min="0"
                  step="1"
                  className="form-control"
                  value={form.stock}
                  onChange={(event) => setForm({ ...form, stock: event.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="product-threshold">Seuil d’alerte *</label>
                <input
                  id="product-threshold"
                  type="number"
                  min="0"
                  step="1"
                  className="form-control"
                  value={form.lowStockThreshold}
                  onChange={(event) => setForm({ ...form, lowStockThreshold: event.target.value })}
                  placeholder="8"
                  required
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="product-supplier">Fournisseur</label>
                <select
                  id="product-supplier"
                  className="form-select"
                  value={form.supplierId}
                  onChange={(event) => setForm({ ...form, supplierId: event.target.value })}
                >
                  <option value="">Aucun fournisseur</option>
                  {suppliers.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <div className="alert alert-light border fs-12 mb-0 py-2">
                  <i className="bi bi-info-circle me-1 text-brand" />
                  Quand le stock passe sous le seuil d’alerte, le produit est inclus dans la
                  commande automatique générée chaque jour à 16h (valeur par défaut : 8 pièces).
                </div>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
