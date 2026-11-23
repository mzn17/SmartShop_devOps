import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import InvoiceView from '../../components/InvoiceView';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { getErrorMessage } from '../../services/api';
import { invoiceService } from '../../services/invoice.service';
import { saleService } from '../../services/sale.service';
import { filenameFromHeaders, saveBlob } from '../../utils/download';
import { formatDateTime, formatMoney, netTotalOf, paymentLabels } from '../../utils/format';

export default function MySales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    saleService
      .my()
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
      const matchesSearch = !term || sale.invoice.toLowerCase().includes(term);
      const matchesPayment = payment === 'all' || sale.payment === payment;
      return matchesSearch && matchesPayment;
    });
  }, [sales, search, payment]);

  const cashTotal = sales.filter((sale) => sale.payment === 'especes').reduce((total, sale) => total + netTotalOf(sale), 0);
  const cardTotal = sales.filter((sale) => sale.payment === 'carte').reduce((total, sale) => total + netTotalOf(sale), 0);

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
        title="Mes ventes"
        subtitle="Consultez uniquement les transactions effectuées avec votre compte."
      />

      {error ? <div className="alert alert-danger py-2 fs-13">{error}</div> : null}

      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <StatCard label="Mes ventes" value={String(sales.length)} icon="bi-receipt" />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard label="Total encaissé" value={formatMoney(cashTotal + cardTotal)} icon="bi-wallet2" iconBg="#dcfce7" iconColor="#15803d" />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard label="Espèces" value={formatMoney(cashTotal)} icon="bi-cash" iconBg="#e0f2fe" iconColor="#0369a1" />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard label="Carte" value={formatMoney(cardTotal)} icon="bi-credit-card" iconBg="#f3e8ff" iconColor="#7e22ce" />
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
                  placeholder="Rechercher une facture…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  style={{ borderRadius: '0 10px 10px 0' }}
                />
              </div>
            </div>
            <div className="col-8 col-lg-3">
              <select className="form-select" value={payment} onChange={(event) => setPayment(event.target.value)}>
                <option value="all">Tous les paiements</option>
                <option value="especes">Espèces</option>
                <option value="carte">Carte bancaire</option>
              </select>
            </div>
            <div className="col-4 col-lg-2 text-lg-end align-self-center">
              <span className="text-muted fs-12">{filtered.length} résultat(s)</span>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-modern align-middle">
            <thead>
              <tr>
                <th>Facture</th>
                <th>Date & heure</th>
                <th className="text-center">Articles</th>
                <th>Paiement</th>
                <th className="text-end">Total</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <span className="spinner-border spinner-border-sm text-brand me-2" />
                    Chargement de vos ventes…
                  </td>
                </tr>
              ) : null}

              {!loading && filtered.map((sale) => (
                <tr key={sale.id}>
                  <td className="fw-semibold">{sale.invoice}</td>
                  <td className="text-muted fs-13">{formatDateTime(sale.date)}</td>
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
                  <td className="text-end">
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => openDetail(sale)}>
                      <i className="bi bi-eye me-1" /> Facture
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !filtered.length ? (
            <EmptyState icon="bi-receipt" title="Aucune vente" text="Les ventes que vous encaissez apparaîtront ici." />
          ) : null}
        </div>
      </div>

      {selected ? (
        <Modal
          title="Facture client"
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
                <i className="bi bi-printer me-1" /> Imprimer
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
