import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { getErrorMessage } from '../../services/api';
import { dashboardService } from '../../services/dashboard.service';
import { formatDateTime, formatMoney, netTotalOf, paymentLabels } from '../../utils/format';

const periods = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function CashRegister() {
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(today());
  const [data, setData] = useState({ sales: [], summary: {}, byCashier: [], dailyRevenue: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    dashboardService
      .cashRegister({ period, date })
      .then((result) => {
        if (active) setData(result);
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
  }, [period, date]);

  const sales = data.sales || [];
  const cashTotal = data.summary?.cashTotal || 0;
  const cardTotal = data.summary?.cardTotal || 0;
  const grandTotal = data.summary?.grandTotal || 0;
  const byCashier = data.byCashier || [];
  const dailyRevenue = data.dailyRevenue || [];

  const exportReport = async (format) => {
    setNotice('');
    try {
      const response = await dashboardService.exportReport({
        format: format.toLowerCase() === 'excel' ? 'excel' : 'pdf',
        period,
        date,
      });
      const extension = format.toLowerCase() === 'excel' ? 'xlsx' : 'pdf';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-${period}-${date}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setNotice(`Export ${format} téléchargé.`);
    } catch (exportError) {
      setNotice(getErrorMessage(exportError));
    }
  };

  return (
    <>
      <PageHeader
        title="Caisse & recettes"
        subtitle="Contrôlez les encaissements en espèces et par carte bancaire."
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => exportReport('Excel')}>
              <i className="bi bi-file-earmark-excel me-1" /> Excel
            </button>
            <button type="button" className="btn btn-brand" onClick={() => exportReport('PDF')}>
              <i className="bi bi-file-earmark-pdf me-1" /> Exporter PDF
            </button>
          </>
        }
      />

      {error ? <div className="alert alert-danger py-2 fs-13">{error}</div> : null}
      {notice ? <div className="alert alert-info py-2 fs-13">{notice}</div> : null}

      <div className="card mb-4">
        <div className="card-body d-flex flex-wrap align-items-end gap-3">
          <div>
            <label className="form-label d-block">Période</label>
            <div className="btn-group" role="group">
              {periods.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`btn btn-sm ${period === item.key ? 'btn-brand' : 'btn-soft'}`}
                  onClick={() => setPeriod(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {period === 'day' ? (
            <div>
              <label className="form-label d-block" htmlFor="revenue-date">Date</label>
              <input
                id="revenue-date"
                type="date"
                className="form-control"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          ) : null}
          <div className="ms-auto text-md-end">
            <div className="text-muted fs-12">Total de la période</div>
            <div className="fs-4 fw-800 text-brand">{formatMoney(grandTotal)}</div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <StatCard label="Recette en espèces" value={formatMoney(cashTotal)} icon="bi-cash-coin" />
        </div>
        <div className="col-md-4">
          <StatCard label="Recette par carte" value={formatMoney(cardTotal)} icon="bi-credit-card" iconBg="#e0f2fe" iconColor="#0369a1" />
        </div>
        <div className="col-md-4">
          <StatCard label="Recette totale" value={formatMoney(grandTotal)} icon="bi-safe2" iconBg="#dcfce7" iconColor="#15803d" />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-xl-6">
          <div className="card h-100">
            <div className="card-header">
              <div>Évolution de la recette</div>
              <div className="text-muted fs-12 fw-normal mt-1">
                {period === 'day' ? 'Cumul par heure' : 'Cumul par jour'} (espèces + carte)
              </div>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-5">
                  <span className="spinner-border spinner-border-sm text-brand me-2" />
                  Chargement…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailyRevenue} margin={{ top: 8, right: 6, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f0" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={48} />
                    <Tooltip
                      formatter={(value) => formatMoney(value)}
                      contentStyle={{ borderRadius: 10, border: '1px solid #e7ecea', fontSize: 12 }}
                      cursor={{ fill: 'rgba(15,118,110,0.06)' }}
                    />
                    <Bar dataKey="total" name="Recette" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={38} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card h-100">
            <div className="card-header">
              <div>Répartition par caissier</div>
              <div className="text-muted fs-12 fw-normal mt-1">{sales.length} vente(s) sur la période</div>
            </div>
            <div className="table-responsive">
              <table className="table table-modern align-middle">
                <thead>
                  <tr>
                    <th>Caissier</th>
                    <th className="text-center">Ventes</th>
                    <th className="text-end">Espèces</th>
                    <th className="text-end">Carte</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {byCashier.map((row) => (
                    <tr key={row.cashier}>
                      <td className="fw-semibold">{row.cashier}</td>
                      <td className="text-center">{row.sales}</td>
                      <td className="text-end">{formatMoney(row.especes)}</td>
                      <td className="text-end">{formatMoney(row.carte)}</td>
                      <td className="text-end fw-bold">{formatMoney(row.total)}</td>
                    </tr>
                  ))}
                  {!byCashier.length ? (
                    <tr>
                      <td colSpan="5" className="text-center text-muted fs-13 py-3">
                        Aucune recette enregistrée pour cette période.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>Détail des encaissements</div>
          <span className="badge-soft-neutral">{sales.length} transaction(s)</span>
        </div>
        <div className="table-responsive">
          <table className="table table-modern align-middle">
            <thead>
              <tr>
                <th>Facture</th>
                <th>Date & heure</th>
                <th>Caissier</th>
                <th>Paiement</th>
                <th className="text-end">Montant</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="fw-semibold">{sale.invoice}</td>
                  <td className="text-muted fs-13">{formatDateTime(sale.date)}</td>
                  <td>{sale.cashier || '—'}</td>
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
                </tr>
              ))}
              {!sales.length ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted fs-13 py-3">
                    Aucune transaction sur cette période.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
