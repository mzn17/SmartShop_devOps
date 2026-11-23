import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { orderService } from '../../services/order.service';
import { productService } from '../../services/product.service';
import { supplierService } from '../../services/supplier.service';
import { filenameFromHeaders, saveBlob } from '../../utils/download';
import { formatDateTime, formatMoney, orderStatus } from '../../utils/format';

const tabs = [
  { key: 'all', label: 'Toutes' },
  { key: 'en_attente', label: 'En attente' },
  { key: 'validee', label: 'Validées' },
  { key: 'recue', label: 'Reçues' },
  { key: 'refusee', label: 'Refusées' },
];

export default function AdminOrders() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [notice, setNotice] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [source, setSource] = useState('manuelle');
  const [form, setForm] = useState({ supplierId: '', lines: [] });
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [saving, setSaving] = useState(false);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [orderList, productList, supplierList] = await Promise.all([
        orderService.list(),
        productService.list(),
        supplierService.list(),
      ]);
      setOrders(orderList);
      setProducts(productList);
      setSuppliers(supplierList);
      setForm((previous) => ({
        ...previous,
        supplierId: previous.supplierId || supplierList[0]?.id || '',
      }));
      setProductId((previous) => previous || productList[0]?.id || '');
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(
    () => (tab === 'all' ? orders : orders.filter((order) => order.status === tab)),
    [orders, tab]
  );

  const pendingCount = orders.filter((order) => order.status === 'en_attente').length;
  const lowStock = products.filter(
    (product) => product.stock < (product.lowStockThreshold ?? 8)
  );
  const orderTotal = form.lines.reduce((total, line) => total + line.price * line.quantity, 0);

  const openManualOrder = () => {
    setSource('manuelle');
    setForm({ supplierId: suppliers[0]?.id || '', lines: [] });
    setProductId(products[0]?.id || '');
    setQuantity(10);
    setShowModal(true);
  };

  const generateAutoOrder = async () => {
    setSaving(true);
    try {
      const created = await orderService.generateLowStock();
      flash(`${created.length} commande(s) générée(s) depuis les alertes de stock.`);
      await loadData();
      setTab('en_attente');
    } catch (generateError) {
      flash(getErrorMessage(generateError));
    } finally {
      setSaving(false);
    }
  };

  const addLine = () => {
    const product = products.find((item) => item.id === productId);
    if (!product || Number(quantity) <= 0) return;

    const price = product.purchasePrice || Number((product.price * 0.7).toFixed(3));

    setForm((previous) => {
      const existing = previous.lines.find((line) => line.productId === product.id);
      if (existing) {
        return {
          ...previous,
          lines: previous.lines.map((line) =>
            line.productId === product.id
              ? { ...line, quantity: line.quantity + Number(quantity) }
              : line
          ),
        };
      }
      return {
        ...previous,
        lines: [
          ...previous.lines,
          {
            productId: product.id,
            product: product.name,
            quantity: Number(quantity),
            price,
          },
        ],
      };
    });
  };

  const removeLine = (id) => {
    setForm((previous) => ({ ...previous, lines: previous.lines.filter((line) => line.productId !== id) }));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!form.lines.length) {
      flash('Ajoutez au moins un produit à la commande.');
      return;
    }

    setSaving(true);
    try {
      const created = await orderService.create({
        supplier: form.supplierId || null,
        source,
        lines: form.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          price: line.price,
        })),
      });
      setShowModal(false);
      setTab('en_attente');
      flash(`Commande ${created.number} créée et en attente de validation.`);
      await loadData();
    } catch (saveError) {
      flash(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const downloadOrderPdf = async (order) => {
    try {
      const response = await orderService.downloadPdf(order.id);
      saveBlob(
        response.data,
        filenameFromHeaders(response.headers, `${order.number}.pdf`)
      );
    } catch (downloadError) {
      flash(getErrorMessage(downloadError));
    }
  };

  const updateStatus = async (order, status) => {
    try {
      await orderService.updateStatus(order.id, status);
      const labels = {
        validee: 'validée : le réapprovisionnement peut être lancé.',
        refusee: 'refusée.',
        recue: 'marquée comme reçue : le stock a été mis à jour.',
      };
      flash(`Commande ${order.number} ${labels[status]}`);
      await loadData();
    } catch (updateError) {
      flash(getErrorMessage(updateError));
    }
  };

  return (
    <>
      <PageHeader
        title="Commandes fournisseurs"
        subtitle="Gérez les commandes manuelles et celles générées automatiquement."
        actions={
          isAdmin ? (
            <>
              <button type="button" className="btn btn-soft" onClick={generateAutoOrder} disabled={saving}>
                <i className="bi bi-stars me-1" /> Générer depuis les alertes
              </button>
              <button type="button" className="btn btn-brand" onClick={openManualOrder}>
                <i className="bi bi-plus-lg me-1" /> Nouvelle commande
              </button>
            </>
          ) : null
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

      <div className="alert border-0 fs-13 d-flex align-items-start gap-2" style={{ background: '#ecfdf5', color: '#166534' }}>
        <i className="bi bi-robot fs-5" />
        <div>
          <strong>Réapprovisionnement automatique :</strong> chaque jour à 16h00, les produits dont
          le stock est inférieur au seuil sont détectés et un e-mail est envoyé à l'administrateur.
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Commandes</div>
            <div className="stat-value">{orders.length}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">En attente</div>
            <div className="stat-value text-warning">{pendingCount}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Produits en alerte</div>
            <div className="stat-value text-danger">{lowStock.length}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Montant en attente</div>
            <div className="stat-value fs-5">
              {formatMoney(orders.filter((order) => order.status === 'en_attente').reduce((total, order) => total + order.total, 0))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header pb-0 border-0">
          <ul className="nav nav-tabs border-0 gap-1">
            {tabs.map((item) => (
              <li className="nav-item" key={item.key}>
                <button
                  type="button"
                  className={`nav-link border-0 ${tab === item.key ? 'active fw-semibold' : 'text-muted'}`}
                  style={{
                    borderRadius: 9,
                    background: tab === item.key ? '#ccfbf1' : 'transparent',
                    color: tab === item.key ? '#0f766e' : undefined,
                    fontSize: '0.82rem',
                  }}
                  onClick={() => setTab(item.key)}
                >
                  {item.label}
                  {item.key === 'en_attente' && pendingCount ? (
                    <span className="badge text-bg-warning ms-1">{pendingCount}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="table-responsive">
          <table className="table table-modern align-middle">
            <thead>
              <tr>
                <th>Commande</th>
                <th>Fournisseur</th>
                <th>Origine</th>
                <th className="text-center">Produits</th>
                <th className="text-end">Montant</th>
                <th>Statut</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <span className="spinner-border spinner-border-sm text-brand me-2" />
                    Chargement des commandes…
                  </td>
                </tr>
              ) : null}

              {!loading && filtered.map((order) => {
                const status = orderStatus[order.status] || { label: order.status, className: 'badge-soft-neutral' };
                return (
                  <tr key={order.id}>
                    <td>
                      <div className="fw-semibold">{order.number}</div>
                      <div className="text-muted fs-12">{formatDateTime(order.date)}</div>
                    </td>
                    <td>{order.supplier || '—'}</td>
                    <td>
                      <span className={`badge-soft-${order.source === 'automatique' ? 'info' : 'neutral'}`}>
                        {order.source === 'automatique' ? (
                          <><i className="bi bi-robot me-1" />Automatique</>
                        ) : (
                          <><i className="bi bi-person me-1" />Manuelle</>
                        )}
                      </span>
                    </td>
                    <td className="text-center">{order.items}</td>
                    <td className="text-end fw-bold">{formatMoney(order.total)}</td>
                    <td>
                      <span className={status.className}>{status.label}</span>
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button type="button" className="btn btn-soft btn-icon" title="Voir le détail" onClick={() => setSelected(order)}>
                          <i className="bi bi-eye" />
                        </button>
                        {order.status === 'en_attente' && isAdmin ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-brand btn-sm"
                              onClick={() => updateStatus(order, 'validee')}
                            >
                              Valider
                            </button>
                            <button
                              type="button"
                              className="btn btn-soft btn-sm text-danger"
                              onClick={() => updateStatus(order, 'refusee')}
                            >
                              Refuser
                            </button>
                          </>
                        ) : null}
                        {order.status === 'validee' ? (
                          <button
                            type="button"
                            className="btn btn-brand btn-sm"
                            onClick={() => updateStatus(order, 'recue')}
                          >
                            Réceptionner
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
            <EmptyState icon="bi-truck" title="Aucune commande" text="Aucune commande ne correspond à ce filtre." />
          ) : null}
        </div>
      </div>

      {showModal ? (
        <Modal
          title={source === 'automatique' ? 'Commande générée depuis les alertes' : 'Nouvelle commande fournisseur'}
          subtitle="Vérifiez les lignes puis validez pour enregistrer la commande."
          size="modal-lg"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" form="order-form" className="btn btn-brand" disabled={!form.lines.length || saving}>
                <i className="bi bi-check-lg me-1" /> {saving ? 'Enregistrement…' : 'Créer la commande'}
              </button>
            </>
          }
        >
          <form id="order-form" onSubmit={submitOrder}>
            <div className="row g-3 mb-3">
              <div className="col-md-7">
                <label className="form-label">Fournisseur</label>
                <select
                  className="form-select"
                  value={form.supplierId}
                  onChange={(event) => setForm({ ...form, supplierId: event.target.value })}
                >
                  <option value="">Aucun fournisseur</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-5">
                <label className="form-label">Origine</label>
                <input className="form-control" value={source === 'automatique' ? 'Automatique (stock faible)' : 'Manuelle'} readOnly />
              </div>
            </div>

            <div className="row g-2 align-items-end mb-3">
              <div className="col-md-6">
                <label className="form-label">Produit</label>
                <select className="form-select" value={productId} onChange={(event) => setProductId(event.target.value)}>
                  <option value="">Sélectionner…</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} — stock {product.stock}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Quantité</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </div>
              <div className="col-md-3">
                <button type="button" className="btn btn-soft w-100" onClick={addLine}>
                  <i className="bi bi-plus-lg me-1" /> Ajouter
                </button>
              </div>
            </div>

            <div className="table-responsive border rounded-3">
              <table className="table table-modern mb-0">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th className="text-center">Qté</th>
                    <th className="text-end">Prix achat</th>
                    <th className="text-end">Sous-total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line) => (
                    <tr key={line.productId}>
                      <td className="fw-semibold">{line.product}</td>
                      <td className="text-center">{line.quantity}</td>
                      <td className="text-end">{formatMoney(line.price)}</td>
                      <td className="text-end fw-semibold">{formatMoney(line.price * line.quantity)}</td>
                      <td className="text-end">
                        <button type="button" className="btn btn-soft btn-icon text-danger" onClick={() => removeLine(line.productId)}>
                          <i className="bi bi-x-lg" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!form.lines.length ? (
                    <tr>
                      <td colSpan="5" className="text-center text-muted fs-13 py-3">
                        Aucune ligne. Ajoutez des produits à la commande.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-end mt-3">
              <div className="text-end">
                <div className="text-muted fs-12">Montant total de la commande</div>
                <div className="fs-4 fw-800 text-brand">{formatMoney(orderTotal)}</div>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}

      {selected ? (
        <Modal
          title={`Commande ${selected.number}`}
          subtitle={`${selected.supplier || '—'} · ${formatDateTime(selected.date)}`}
          size="modal-lg"
          onClose={() => setSelected(null)}
          footer={
            <>
              <button type="button" className="btn btn-soft" onClick={() => setSelected(null)}>Fermer</button>
              <button type="button" className="btn btn-brand" onClick={() => downloadOrderPdf(selected)}>
                <i className="bi bi-file-earmark-pdf me-1" /> Télécharger le bon de commande
              </button>
            </>
          }
        >
          <div className="d-flex flex-wrap gap-2 mb-3">
            <span className={orderStatus[selected.status]?.className || 'badge-soft-neutral'}>
              {orderStatus[selected.status]?.label || selected.status}
            </span>
            <span className={`badge-soft-${selected.source === 'automatique' ? 'info' : 'neutral'}`}>
              {selected.source === 'automatique' ? 'Génération automatique' : 'Commande manuelle'}
            </span>
            <span className="badge-soft-neutral">{selected.items} ligne(s)</span>
          </div>
          <div className="table-responsive border rounded-3">
            <table className="table table-modern mb-0">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th className="text-center">Quantité</th>
                  <th className="text-end">Prix achat</th>
                  <th className="text-end">Sous-total</th>
                </tr>
              </thead>
              <tbody>
                {(selected.lines || []).map((line, index) => (
                  <tr key={`${line.product}-${index}`}>
                    <td className="fw-semibold">{line.product}</td>
                    <td className="text-center">{line.quantity}</td>
                    <td className="text-end">{formatMoney(line.price)}</td>
                    <td className="text-end fw-semibold">{formatMoney(line.price * line.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between border-top mt-3 pt-3">
            <span className="text-muted fs-13">Montant total</span>
            <span className="fw-800 text-brand">{formatMoney(selected.total)}</span>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
