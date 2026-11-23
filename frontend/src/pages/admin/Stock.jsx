import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { getErrorMessage } from '../../services/api';
import { productService } from '../../services/product.service';
import { stockService } from '../../services/stock.service';
import { formatDateTime, stockStatus } from '../../utils/format';

const typeMeta = {
  entree: { label: 'Entrée', className: 'badge-soft-success', icon: 'bi-box-arrow-in-down' },
  sortie: { label: 'Sortie', className: 'badge-soft-danger', icon: 'bi-box-arrow-up' },
  ajustement: { label: 'Ajustement', className: 'badge-soft-info', icon: 'bi-sliders' },
};

const emptyForm = (products) => ({
  productId: products[0]?.id || '',
  type: 'entree',
  quantity: 1,
  reason: 'Réception fournisseur',
});

export default function Stock() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [form, setForm] = useState(emptyForm([]));

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [productList, movementList] = await Promise.all([
        productService.list(),
        stockService.listMovements({ limit: 500 }),
      ]);
      setProducts(productList);
      setMovements(movementList);
      setForm((previous) => ({
        ...previous,
        productId: productList.some((item) => item.id === previous.productId)
          ? previous.productId
          : productList[0]?.id || '',
      }));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedProduct = products.find((item) => item.id === form.productId);

  const filteredMovements = useMemo(
    () =>
      typeFilter === 'all'
        ? movements
        : movements.filter((movement) => movement.type === typeFilter),
    [movements, typeFilter]
  );

  const lowStock = products.filter(
    (product) => product.stock < (product.lowStockThreshold ?? 8)
  );
  const outOfStock = products.filter((product) => product.stock <= 0);
  const stockValue = products.reduce(
    (total, product) => total + (product.purchasePrice || product.price) * product.stock,
    0
  );

  const changeType = (type) => {
    setForm((previous) => ({
      ...previous,
      type,
      quantity: type === 'ajustement' ? selectedProduct?.stock ?? 0 : 1,
      reason:
        type === 'entree'
          ? 'Réception fournisseur'
          : type === 'sortie'
            ? 'Sortie exceptionnelle'
            : 'Correction d’inventaire',
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.productId) {
      flash('Sélectionnez un produit.');
      return;
    }
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      flash('La quantité doit être un entier positif.');
      return;
    }

    setSaving(true);
    try {
      await stockService.createMovement({
        productId: form.productId,
        type: form.type,
        quantity,
        reason: form.reason,
      });
      flash('Mouvement de stock enregistré et stock mis à jour.');
      setForm((previous) => ({
        ...previous,
        quantity: previous.type === 'ajustement' ? quantity : 1,
      }));
      await loadData();
    } catch (saveError) {
      flash(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Stock & mouvements"
        subtitle="Ajustez les quantités, enregistrez les entrées/sorties et suivez l’inventaire."
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
            <div className="stat-label">Références actives</div>
            <div className="stat-value">{products.length}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Valeur du stock (achat)</div>
            <div className="stat-value fs-5">{stockValue.toFixed(3)} DT</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Stock faible</div>
            <div className="stat-value text-warning">{lowStock.length}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">En rupture</div>
            <div className="stat-value text-danger">{outOfStock.length}</div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-xl-5">
          <div className="card">
            <div className="card-header">
              <div>Nouveau mouvement de stock</div>
              <div className="text-muted fs-12 fw-normal mt-1">US030 – ajustement d’inventaire</div>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <span className="spinner-border spinner-border-sm text-brand me-2" />
                  Chargement…
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="stock-product">Produit</label>
                    <select
                      id="stock-product"
                      className="form-select"
                      value={form.productId}
                      onChange={(event) => setForm({ ...form, productId: event.target.value })}
                      required
                    >
                      <option value="">Sélectionner…</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} — stock actuel : {product.stock}
                        </option>
                      ))}
                    </select>
                    {selectedProduct ? (
                      <div className="d-flex justify-content-between align-items-center mt-2 fs-12">
                        <span className={stockStatus(selectedProduct.stock, selectedProduct.lowStockThreshold ?? 8).className}>
                          {stockStatus(selectedProduct.stock, selectedProduct.lowStockThreshold ?? 8).label}
                        </span>
                        <span className="text-muted">
                          Seuil d’alerte : {selectedProduct.lowStockThreshold ?? 8}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Type de mouvement</label>
                    <div className="d-flex gap-2">
                      {Object.entries(typeMeta).map(([key, meta]) => (
                        <button
                          key={key}
                          type="button"
                          className={`payment-option ${form.type === key ? 'active' : ''}`}
                          onClick={() => changeType(key)}
                        >
                          <i className={`bi ${meta.icon}`} />
                          <span className="fs-13 fw-semibold">{meta.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-5">
                      <label className="form-label" htmlFor="stock-quantity">
                        {form.type === 'ajustement' ? 'Nouvelle quantité' : 'Quantité'}
                      </label>
                      <input
                        id="stock-quantity"
                        type="number"
                        min="0"
                        step="1"
                        className="form-control"
                        value={form.quantity}
                        onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                        required
                      />
                    </div>
                    <div className="col-7">
                      <label className="form-label" htmlFor="stock-reason">Motif</label>
                      <input
                        id="stock-reason"
                        className="form-control"
                        value={form.reason}
                        onChange={(event) => setForm({ ...form, reason: event.target.value })}
                        placeholder="Réception, casse, inventaire…"
                      />
                    </div>
                  </div>

                  <div className="alert alert-light border fs-12 py-2">
                    <i className="bi bi-info-circle me-1 text-brand" />
                    {form.type === 'ajustement'
                      ? 'Le stock sera remplacé par la quantité saisie (inventaire).'
                      : form.type === 'entree'
                        ? 'La quantité sera ajoutée au stock actuel.'
                        : 'La quantité sera retirée du stock actuel (contrôle de disponibilité).'}
                  </div>

                  <button type="submit" className="btn btn-brand w-100" disabled={!products.length || saving}>
                    <i className="bi bi-check2-circle me-1" />
                    {saving ? 'Enregistrement…' : 'Enregistrer le mouvement'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="card h-100">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <div>Historique des mouvements</div>
                <div className="text-muted fs-12 fw-normal mt-1">
                  {filteredMovements.length} mouvement(s)
                </div>
              </div>
              <select
                className="form-select form-select-sm"
                style={{ maxWidth: 180 }}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">Tous les types</option>
                <option value="entree">Entrées</option>
                <option value="sortie">Sorties</option>
                <option value="ajustement">Ajustements</option>
              </select>
            </div>
            <div className="table-responsive">
              <table className="table table-modern align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Produit</th>
                    <th>Type</th>
                    <th className="text-center">Qté</th>
                    <th>Motif</th>
                    <th>Utilisateur</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5">
                        <span className="spinner-border spinner-border-sm text-brand me-2" />
                        Chargement des mouvements…
                      </td>
                    </tr>
                  ) : null}

                  {!loading && filteredMovements.map((movement) => {
                    const meta = typeMeta[movement.type] || typeMeta.ajustement;
                    return (
                      <tr key={movement.id}>
                        <td className="text-muted fs-13">{formatDateTime(movement.date)}</td>
                        <td>
                          <div className="fw-semibold">{movement.product || '—'}</div>
                          <div className="text-muted fs-12 font-monospace">{movement.productId?.slice(-6)}</div>
                        </td>
                        <td>
                          <span className={meta.className}>
                            <i className={`bi ${meta.icon} me-1`} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="text-center fw-semibold">{movement.quantity}</td>
                        <td className="text-muted fs-13">{movement.reason || '—'}</td>
                        <td className="text-muted fs-13">{movement.user || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!loading && !filteredMovements.length ? (
                <EmptyState
                  icon="bi-arrow-left-right"
                  title="Aucun mouvement"
                  text="Les entrées, sorties et ajustements apparaîtront ici."
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
