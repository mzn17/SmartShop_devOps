import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { getErrorMessage } from '../../services/api';
import { dashboardService } from '../../services/dashboard.service';
import { formatMoney } from '../../utils/format';

const periods = [
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: 'year', label: 'Année' },
];

const periodLabels = {
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  year: 'Année en cours',
};

export default function Reports() {
  const [period, setPeriod] = useState('7d');
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      dashboardService.stats({ period }),
      dashboardService.salesChart({ period }),
      dashboardService.topProducts({ period }),
    ])
      .then(([statsData, chartData, topData]) => {
        if (!active) return;
        setStats(statsData);
        setChart(chartData);
        setTopProducts(topData);
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
  }, [period]);

  const cashRevenue = chart.reduce((total, day) => total + day.especes, 0);
  const cardRevenue = chart.reduce((total, day) => total + day.carte, 0);
  const totalRevenue = cashRevenue + cardRevenue;

  const paymentData = [
    { name: 'Espèces', value: cashRevenue, color: '#0f766e' },
    { name: 'Carte bancaire', value: cardRevenue, color: '#22c55e' },
  ];

  const exportReport = async (format) => {
    setNotice('');
    try {
      const response = await dashboardService.exportReport({
        format: format.toLowerCase() === 'excel' ? 'excel' : 'pdf',
        period,
      });
      const extension = format.toLowerCase() === 'excel' ? 'xlsx' : 'pdf';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-${period}.${extension}`;
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
        title="Rapports BI"
        subtitle="Analysez les ventes, les recettes et les produits les plus vendus."
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => exportReport('Excel')}>
              <i className="bi bi-file-earmark-excel me-1" /> Excel
            </button>
            <button type="button" className="btn btn-brand" onClick={() => exportReport('PDF')}>
              <i className="bi bi-file-earmark-pdf me-1" /> Export PDF
            </button>
          </>
        }
      />

      {error ? <div className="alert alert-danger py-2 fs-13">{error}</div> : null}
      {notice ? <div className="alert alert-info py-2 fs-13">{notice}</div> : null}

      <div className="d-flex flex-wrap gap-2 mb-4">
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
        <span className="text-muted fs-13 align-self-center ms-2">{periodLabels[period]}</span>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <span className="spinner-border text-brand me-2" />
          Chargement des rapports…
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-xl-3">
              <StatCard label="Chiffre d'affaires" value={formatMoney(stats?.revenue || 0)} icon="bi-graph-up-arrow" trendLabel={periodLabels[period]} />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard label="Nombre de ventes" value={String(stats?.salesCount || 0)} icon="bi-receipt" iconBg="#e0f2fe" iconColor="#0369a1" trendLabel={periodLabels[period]} />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard label="Panier moyen" value={formatMoney(stats?.averageBasket || 0)} icon="bi-basket" iconBg="#dcfce7" iconColor="#15803d" trendLabel="toutes ventes" />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard
                label="Taux carte bancaire"
                value={`${totalRevenue ? ((cardRevenue / totalRevenue) * 100).toFixed(1) : 0} %`}
                icon="bi-credit-card"
                iconBg="#f3e8ff"
                iconColor="#7e22ce"
                trendLabel="part des paiements"
              />
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-xl-8">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <div>Évolution des recettes</div>
                    <div className="text-muted fs-12 fw-normal mt-1">Espèces et carte bancaire</div>
                  </div>
                  <div className="d-flex gap-3 fs-12">
                    <span><span className="legend-dot" style={{ background: '#0f766e' }} />Espèces</span>
                    <span><span className="legend-dot" style={{ background: '#22c55e' }} />Carte</span>
                  </div>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chart} margin={{ top: 8, right: 6, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="reportCash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0f766e" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="reportCard" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f0" />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={52} />
                      <Tooltip
                        formatter={(value) => formatMoney(value)}
                        contentStyle={{ borderRadius: 10, border: '1px solid #e7ecea', fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="especes" name="Espèces" stroke="#0f766e" strokeWidth={2} fill="url(#reportCash)" />
                      <Area type="monotone" dataKey="carte" name="Carte" stroke="#22c55e" strokeWidth={2} fill="url(#reportCard)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="col-xl-4">
              <div className="card h-100">
                <div className="card-header">
                  <div>Mode de paiement</div>
                  <div className="text-muted fs-12 fw-normal mt-1">Répartition du chiffre d'affaires</div>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie data={paymentData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                        {paymentData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatMoney(value)}
                        contentStyle={{ borderRadius: 10, border: '1px solid #e7ecea', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2">
                    {paymentData.map((entry) => (
                      <div key={entry.name} className="d-flex justify-content-between fs-13 mb-2">
                        <span><span className="legend-dot" style={{ background: entry.color }} />{entry.name}</span>
                        <span className="fw-semibold">{formatMoney(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-top pt-2 mt-1 d-flex justify-content-between fs-13">
                    <span className="text-muted">Total</span>
                    <span className="fw-800 text-brand">{formatMoney(totalRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-xl-7">
              <div className="card h-100">
                <div className="card-header">
                  <div>Produits les plus vendus</div>
                  <div className="text-muted fs-12 fw-normal mt-1">Classement par quantité vendue</div>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topProducts} layout="vertical" margin={{ top: 4, right: 16, left: 18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f0" />
                      <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#475569', fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} pièces`, 'Quantité']}
                        contentStyle={{ borderRadius: 10, border: '1px solid #e7ecea', fontSize: 12 }}
                        cursor={{ fill: 'rgba(15,118,110,0.06)' }}
                      />
                      <Bar dataKey="quantity" fill="#0f766e" radius={[0, 6, 6, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="col-xl-5">
              <div className="card h-100">
                <div className="card-header">
                  <div>Détail du classement</div>
                  <div className="text-muted fs-12 fw-normal mt-1">Quantité et chiffre d'affaires</div>
                </div>
                <div className="table-responsive">
                  <table className="table table-modern align-middle">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Produit</th>
                        <th className="text-center">Qté</th>
                        <th className="text-end">CA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((product, index) => (
                        <tr key={product.name}>
                          <td>
                            <span className={`badge-soft-${index === 0 ? 'success' : 'neutral'}`}>{index + 1}</span>
                          </td>
                          <td className="fw-semibold">{product.name}</td>
                          <td className="text-center">{product.quantity}</td>
                          <td className="text-end fw-bold">{formatMoney(product.revenue)}</td>
                        </tr>
                      ))}
                      {!topProducts.length ? (
                        <tr>
                          <td colSpan="4" className="text-center text-muted fs-13 py-3">
                            Aucune vente sur cette période.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
