import { formatDateTime, formatMoney, netTotalOf, paymentLabels } from '../utils/format';

/**
 * Rendu imprimable d'une facture (US024).
 * `lines` : [{ name, quantity, price }]
 */
export default function InvoiceView({ sale, lines = [] }) {
  const subtotal = lines.reduce((total, line) => total + line.price * line.quantity, 0);
  const total = sale?.total ?? subtotal;

  return (
    <div className="invoice-box invoice-print">
      <div className="invoice-head d-flex justify-content-between align-items-start">
        <div>
          <div className="d-flex align-items-center gap-2">
            <div className="sidebar-brand-icon" style={{ width: 34, height: 34, fontSize: '1rem' }}>
              <i className="bi bi-shop-window" />
            </div>
            <div>
              <div className="fw-800 fs-5 lh-1">SmartStore</div>
              <div className="text-muted fs-12">Gestion de magasin</div>
            </div>
          </div>
          <div className="text-muted fs-12 mt-2">
            Avenue Habib Bourguiba, Nabeul<br />
            Tél. +216 72 000 000 · MF 123456789
          </div>
        </div>
        <div className="text-end">
          <div className="fw-800 fs-5">FACTURE</div>
          <div className="font-monospace fs-13">{sale?.invoice}</div>
          <div className="text-muted fs-12">{formatDateTime(sale?.date)}</div>
        </div>
      </div>

      <div className="row g-2 mb-3 fs-12">
        <div className="col-6">
          <span className="text-muted">Caissier :</span>{' '}
          <span className="fw-semibold">{sale?.cashier}</span>
        </div>
        <div className="col-6 text-end">
          <span className="text-muted">Mode de paiement :</span>{' '}
          <span className="fw-semibold">{paymentLabels[sale?.payment] || '—'}</span>
        </div>
      </div>

      {lines.length > 0 ? (
        <table className="table table-sm align-middle mb-3">
          <thead>
            <tr className="border-bottom">
              <th className="text-muted fw-semibold fs-12">Désignation</th>
              <th className="text-muted fw-semibold fs-12 text-center">Qté</th>
              <th className="text-muted fw-semibold fs-12 text-end">P.U.</th>
              <th className="text-muted fw-semibold fs-12 text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${line.name}-${index}`}>
                <td className="fs-13">{line.name}</td>
                <td className="text-center fs-13">{line.quantity}</td>
                <td className="text-end fs-13">{formatMoney(line.price)}</td>
                <td className="text-end fw-semibold fs-13">{formatMoney(line.price * line.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="alert alert-light border fs-12 py-2">
          <i className="bi bi-info-circle me-1" />
          Le détail des lignes sera chargé depuis l'API (GET /api/sales/:id).
        </div>
      )}

      <div className="d-flex justify-content-end">
        <div style={{ minWidth: 230 }}>
          <div className="total-row">
            <span className="text-muted">Sous-total</span>
            <span className="fw-semibold">{formatMoney(subtotal || total)}</span>
          </div>
          <div className="total-row">
            <span className="text-muted">TVA</span>
            <span className="fw-semibold">{formatMoney(0)}</span>
          </div>
          {sale?.refundedTotal > 0 ? (
            <>
              <div className="total-row">
                <span className="text-muted">Retours</span>
                <span className="fw-semibold text-danger">-{formatMoney(sale.refundedTotal)}</span>
              </div>
              <div className="invoice-total d-flex justify-content-between">
                <span>Net à payer</span>
                <span>{formatMoney(netTotalOf(sale))}</span>
              </div>
            </>
          ) : (
            <div className="invoice-total d-flex justify-content-between">
              <span>Total à payer</span>
              <span>{formatMoney(total)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-muted fs-12 mt-4 pt-2 border-top">
        Merci de votre visite ! Les articles ne sont ni repris ni échangés sans ticket.
      </div>
    </div>
  );
}
