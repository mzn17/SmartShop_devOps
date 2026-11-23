import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import InvoiceView from '../../components/InvoiceView';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { saleStatusMeta } from '../../constants';
import { getErrorMessage } from '../../services/api';
import { invoiceService } from '../../services/invoice.service';
import { saleService } from '../../services/sale.service';
import { filenameFromHeaders, saveBlob } from '../../utils/download';
import { formatDateTime, formatMoney, netTotalOf, paymentLabels } from '../../utils/format';

export default function AdminSales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    saleService
      .list()
      .then((rows) => {
        if (active) setSales(rows);
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sales.filter((sale) => {
      const matchesSearch =
        !term ||
        sale.invoice.toLowerCase().includes(term) ||
        (sale.cashier || '').toLowerCase().includes(term);
      const matchesPayment = payment === 'all' || sale.payment === payment;
      const matchesStatus = status === 'all' || sale.status === status;
      return matchesSearch && matchesPayment && matchesStatus;
    });
  }, [sales, search, payment, status]);

  const totalRevenue = sales.reduce((total, sale) => total + netTotalOf(sale), 0);
  const cashRevenue = sales
    .filter((sale) => sale.payment === 'especes')
    .reduce((total, sale) => total + netTotalOf(sale), 0);
  const cardRevenue = sales
    .filter((sale) => sale.payment === 'carte')
    .reduce((total, sale) => total + netTotalOf(sale), 0);

  const openDetail = async (sale) => {
    setSelected(sale);
    setDetailLoading(true);
    try {
      setSelected(await saleService.getById(sale.id));
    } catch (detailError) {
      setError(getErrorMessage(detailError));
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadInvoice = async () => {
    if (!selected) return;
    try {
      const response = await invoiceService.downloadPdf(selected.id);
      saveBlob(
        response.data,
        filenameFromHeaders(response.headers, `${selected.invoice}.pdf`)
      );
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    }
  };

  return (
    <>
      <PageHeader
        title="Historique des ventes"
        subtitle="Consultez toutes les transactions encaissées par le magasin."
        actions={
          <button type="button" className="btn btn-soft" onClick={() => window.print()}>
            <i className="bi bi-printer me-1" /> Imprimer la liste
          </button>
        }
      />

      {error ? <div className="alert alert-danger py-2 fs-13">{error}</div> : null}

      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <StatCard label="Total encaissé" value={formatMoney(totalRevenue)} icon="bi-wallet2" />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard label="Espèces" value={formatMoney(cashRevenue)} icon="bi-cash" iconBg="#dcfce7" iconColor="#15803d" />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard label="Carte bancaire" value={formatMoney(cardRevenue)} icon="bi-credit-card" iconBg="#e0f2fe" iconColor="#0369a1" />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard label="Nombre de ventes" value={String(sales.length)} icon="bi-receipt" iconBg="#f3e8ff" iconColor="#7e22ce" />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row g-2">
            <div className="col-12 col-lg-6">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0" style={{ borderRadius: '10px 0 0 10px' }}>
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  type="search"
                  className="form-control border-start-0"
                  placeholder="Rechercher par facture ou caissier…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  style={{ borderRadius: '0 10px 10px 0' }}
                />
              </div>
            </div>
            <div className="col-6 col-lg-2">
              <select className="form-select" value={payment} onChange={(event) => setPayment(event.target.value)}>
                <option value="all">Tous les paiements</option>
                <option value="especes">Espèces</option>
                <option value="carte">Carte bancaire</option>
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">Tous les statuts</option>
                <option value="validee">Validée</option>
                <option value="partielle">Retour partiel</option>
                <option value="retournee">Retournée</option>
              </select>
            </div>
            <div className="col-12 col-lg-2 text-lg-end">
              <span className="text-muted fs-12 fw-normal">{filtered.length} vente(s)</span>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-modern align-middle">
            <thead>
              <tr>
                <th>Facture</th>
                <th>Date & heure</th>
                <th>Caissier</th>
                <th className="text-center">Articles</th>
                <th>Paiement</th>
                <th className="text-end">Total</th>
                <th>Statut</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <span className="spinner-border spinner-border-sm text-brand me-2" />
                    Chargement des ventes…
                  </td>
                </tr>
              ) : null}

              {!loading && filtered.map((sale) => (
                <tr key={sale.id}>
                  <td className="fw-semibold">{sale.invoice}</td>
                  <td className="text-muted fs-13">{formatDateTime(sale.date)}</td>
                  <td>{sale.cashier || '—'}</td>
                  <td className="text-center">{sale.items}</td>
                  <td>
                    <span className={`badge-soft-${sale.payment === 'especes' ? 'success' : 'info'}`}>
                      <i className={`bi ${sale.payment === 'especes' ? 'bi-cash' : 'bi-credit-card'} me-1`} />
                      {paymentLabels[sale.payment]}
                    </span>
                  </td>
                  <td className="text-end fw-bold">
                    {formatMoney(netTotalOf(sale))}
                    {sale.refundedTotal > 0 ? (
                      <div className="text-muted fs-12 fw-normal">
                        Retours : -{formatMoney(sale.refundedTotal)}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className={saleStatusMeta[sale.status]?.className}>
                      {saleStatusMeta[sale.status]?.label || sale.status}
                    </span>
                  </td>
                  <td className="text-end">
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => openDetail(sale)}>
                      <i className="bi bi-eye me-1" /> Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 ? (
            <EmptyState icon="bi-receipt" title="Aucune vente trouvée" text="Essayez de modifier vos filtres." />
          ) : null}
        </div>
      </div>

      {selected ? (
        <Modal
          title="Détail de la vente"
          subtitle={selected.invoice}
          size="modal-lg"
          onClose={() => setSelected(null)}
          footer={
            <>
              <button type="button" className="btn btn-soft" onClick={() => setSelected(null)}>Fermer</button>
              <button type="button" className="btn btn-soft" onClick={downloadInvoice}>
                <i className="bi bi-file-earmark-pdf me-1" /> PDF
              </button>
              <button type="button" className="btn btn-brand" onClick={() => window.print()}>
                <i className="bi bi-printer me-1" /> Imprimer la facture
              </button>
            </>
          }
        >
          {detailLoading ? (
            <div className="text-center py-4">
              <span className="spinner-border spinner-border-sm text-brand me-2" />
              Chargement des lignes…
            </div>
          ) : (
            <InvoiceView sale={selected} lines={selected.lines || []} />
          )}
        </Modal>
      ) : null}
    </>
  );
}
