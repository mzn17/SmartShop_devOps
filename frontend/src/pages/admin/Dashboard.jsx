import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
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
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { dashboardService } from '../../services/dashboard.service';
import { orderService } from '../../services/order.service';
import { productService } from '../../services/product.service';
import { saleService } from '../../services/sale.service';
import { formatDateTime, formatMoney, netTotalOf, paymentLabels, stockStatus } from '../../utils/format';

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="d-flex justify-content-between gap-3">
          <span>{entry.name}</span>
          <span className="fw-semibold">{formatMoney(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [revenueByDay, setRevenueByDay] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      dashboardService.stats(),
      dashboardService.salesChart({ period: '7d' }),
      productService.lowStock(),
      orderService.list({ status: 'en_attente' }),
      saleService.list({ limit: 5 }),
    ])
      .then(([statsData, chartData, lowStockData, ordersData, salesData]) => {
        if (!active) return;
        setStats(statsData);
        setRevenueByDay(chartData);
        setLowStock(lowStockData);
        setPendingOrders(ordersData);
        setRecentSales(salesData);
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

  const paymentSplit = [
    {
      name: 'Espèces',
      value: revenueByDay.reduce((total, day) => total + day.especes, 0),
      color: '#0f766e',
    },
    {
      name: 'Carte bancaire',
      value: revenueByDay.reduce((total, day) => total + day.carte, 0),
      color: '#22c55e',
    },
  ];

  const splitTotal = paymentSplit.reduce((total, part) => total + part.value, 0);

  return (
    <>
      <PageHeader
        title={`Bonjour, ${user?.name?.split(' ')[0] || 'Administrateur'} 👋`}
        subtitle="Voici l'activité de votre magasin en un coup d'œil."
        actions={
          <>
            {user?.role === 'admin' ? (
              <Link to="/admin/reports" className="btn btn-soft">
                <i className="bi bi-bar-chart-line me-1" /> Rapports BI
              </Link>
            ) : null}
            <Link to="/admin/orders" className="btn btn-brand">
              <i className="bi bi-plus-lg me-1" /> Nouvelle commande
            </Link>
          </>
        }
      />

      {error ? <div className="alert alert-danger py-2 fs-13">{error}</div> : null}

      {loading ? (
        <div className="text-center py-5">
          <span className="spinner-border text-brand me-2" />
          Chargement du tableau de bord…
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-xl-3">
              <StatCard
                label="Chiffre d'affaires"
                value={formatMoney(stats?.revenue || 0)}
                icon="bi-wallet2"
                trendLabel={`${stats?.salesCount || 0} vente(s) enregistrée(s)`}
              />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard
                label="Ventes du jour"
                value={formatMoney(stats?.todayRevenue || 0)}
                icon="bi-receipt"
                iconBg="#dcfce7"
                iconColor="#15803d"
                trendLabel={`${stats?.todaySalesCount || 0} transaction(s) aujourd'hui`}
              />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard
                label="Panier moyen"
                value={formatMoney(stats?.averageBasket || 0)}
                icon="bi-basket"
                iconBg="#e0f2fe"
                iconColor="#0369a1"
                trendLabel="sur l'ensemble des ventes"
              />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard
                label="Produits en alerte"
                value={String(stats?.lowStockCount ?? lowStock.length).padStart(2, '0')}
                icon="bi-exclamation-triangle"
                iconBg="#fef3c7"
                iconColor="#b45309"
                trendLabel="stock inférieur au seuil"
              />
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-xl-8">
              <div className="card h-100">
                <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <div>Recettes des 7 derniers jours</div>
                    <div className="text-muted fs-12 fw-normal mt-1">Répartition espèces et carte bancaire</div>
                  </div>
                  <div className="d-flex gap-3 fs-12">
                    <span><span className="legend-dot" style={{ background: '#0f766e' }} />Espèces</span>
                    <span><span className="legend-dot" style={{ background: '#22c55e' }} />Carte</span>
                  </div>
                </div>
                <div className="card-body pt-3">
                  <ResponsiveContainer width="100%" height={278}>
                    <AreaChart data={revenueByDay} margin={{ top: 10, right: 6, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0f766e" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="cardGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f0" />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={52} />
                      <Tooltip content={<RevenueTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="especes"
                        name="Espèces"
                        stackId="1"
                        stroke="#0f766e"
                        strokeWidth={2}
                        fill="url(#cashGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="carte"
                        name="Carte"
                        stackId="1"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#cardGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="col-xl-4">
              <div className="card h-100">
                <div className="card-header">
                  <div>Répartition des paiements</div>
                  <div className="text-muted fs-12 fw-normal mt-1">7 derniers jours</div>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={paymentSplit}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={84}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {paymentSplit.map((part) => (
                          <Cell key={part.name} fill={part.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatMoney(value)}
                        contentStyle={{ borderRadius: 10, border: '1px solid #e7ecea', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2">
                    {paymentSplit.map((part) => (
                      <div key={part.name} className="d-flex justify-content-between align-items-center mb-2 fs-13">
                        <span>
                          <span className="legend-dot" style={{ background: part.color }} />
                          {part.name}
                        </span>
                        <span className="fw-semibold">
                          {splitTotal ? ((part.value / splitTotal) * 100).toFixed(0) : 0} % · {formatMoney(part.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-top pt-3 mt-2 d-flex justify-content-between">
                    <span className="text-muted fs-13">Total encaissé</span>
                    <span className="fw-800 text-brand">{formatMoney(splitTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-xl-7">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>Dernières ventes</div>
                  <Link to="/admin/sales" className="fs-13 text-brand fw-semibold">
                    Tout voir <i className="bi bi-arrow-right" />
                  </Link>
                </div>
                <div className="table-responsive">
                  <table className="table table-modern align-middle">
                    <thead>
                      <tr>
                        <th>Facture</th>
                        <th>Caissier</th>
                        <th>Paiement</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSales.map((sale) => (
                        <tr key={sale.id}>
                          <td>
                            <div className="fw-semibold">{sale.invoice}</div>
                            <div className="text-muted fs-12">{formatDateTime(sale.date)}</div>
                          </td>
                          <td>{sale.cashier || '—'}</td>
                          <td>
                            <span className={`badge-soft-${sale.payment === 'especes' ? 'success' : 'info'}`}>
                              <i className={`bi ${sale.payment === 'especes' ? 'bi-cash' : 'bi-credit-card'} me-1`} />
                              {paymentLabels[sale.payment]}
                            </span>
                          </td>
                          <td className="text-end fw-bold">{formatMoney(netTotalOf(sale))}</td>
                        </tr>
                      ))}
                      {!recentSales.length ? (
                        <tr>
                          <td colSpan="4" className="text-center text-muted fs-13 py-3">
                            Aucune vente enregistrée pour le moment.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-xl-5">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <div>Alertes de stock</div>
                    <div className="text-muted fs-12 fw-normal mt-1">
                      {stats?.pendingOrders ?? pendingOrders.length} commande(s) en attente de validation
                    </div>
                  </div>
                  <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/admin/products')}>
                    Gérer
                  </button>
                </div>
                <div className="table-responsive">
                  <table className="table table-modern align-middle">
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Stock</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStock.map((product) => {
                        const status = stockStatus(product.stock);
                        return (
                          <tr key={product.id}>
                            <td>
                              <div className="fw-semibold">{product.name}</div>
                              <div className="text-muted fs-12">{product.category || '—'}</div>
                            </td>
                            <td>
                              <span className={status.className}>{product.stock} pièces</span>
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-soft btn-sm"
                                onClick={() => navigate('/admin/orders')}
                              >
                                Commander
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!lowStock.length ? (
                        <tr>
                          <td colSpan="3" className="text-center text-muted fs-13 py-3">
                            Aucun produit sous le seuil d'alerte.
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
