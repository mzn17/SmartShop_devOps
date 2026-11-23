const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

/** Recette nette d'une vente : total encaissé moins les retours. */
const netTotalExpression = {
  $subtract: ['$total', { $ifNull: ['$refundedTotal', 0] }],
};

const netTotalOf = (sale) => Number(((sale.total || 0) - (sale.refundedTotal || 0)).toFixed(3));

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const endOfDay = (value = new Date()) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** Clé locale AAAA-MM-JJ (évite les décalages UTC autour de minuit). */
const localDateKey = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
};

const getPeriodRange = (period = '7d', dateValue) => {
  const today = dateValue ? new Date(dateValue) : new Date();

  if (period === 'day') {
    return { start: startOfDay(today), end: endOfDay(today) };
  }
  if (period === 'week') {
    return { start: startOfDay(addDays(today, -6)), end: endOfDay(today) };
  }
  if (period === 'month') {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: endOfDay(today),
    };
  }
  if (period === 'year') {
    return { start: new Date(today.getFullYear(), 0, 1), end: endOfDay(today) };
  }
  if (period === '30d') {
    return { start: startOfDay(addDays(today, -29)), end: endOfDay(today) };
  }
  return { start: startOfDay(addDays(today, -6)), end: endOfDay(today) };
};

const serializeSale = (sale) => {
  const data = sale.toJSON();
  return {
    ...data,
    cashier: sale.cashier?.name || null,
    cashierId: sale.cashier?.id || null,
    netTotal: netTotalOf(sale),
    lines: (sale.lines || []).map((line) => ({
      productId: line.product?.id || line.product?.toString?.() || null,
      name: line.name,
      quantity: line.quantity,
      price: line.price,
    })),
  };
};

/**
 * GET /api/dashboard/stats?period=all|day|week|month|year|7d|30d&date=YYYY-MM-DD
 *
 * `period` est optionnel : sans période (ou avec `all`), les indicateurs
 * portent sur l'ensemble de l'historique. Les rapports BI utilisent les
 * périodes 7d / 30d / year pour rester cohérents avec les graphiques.
 */
const stats = asyncHandler(async (req, res) => {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const period = req.query.period || 'all';

  const hasPeriod = period && period !== 'all';
  const range = hasPeriod ? getPeriodRange(period, req.query.date) : null;
  const saleMatch = range ? { date: { $gte: range.start, $lte: range.end } } : {};

  const [revenue, todayRevenue, productCount, lowStockCount, pendingOrders, totalRevenue] =
    await Promise.all([
      Sale.aggregate([
        { $match: saleMatch },
        { $group: { _id: null, total: { $sum: netTotalExpression }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: netTotalExpression }, count: { $sum: 1 } } },
      ]),
      Product.countDocuments({ active: true }),
      Product.countDocuments({
        active: true,
        $expr: {
          $lt: [
            '$stock',
            { $ifNull: ['$lowStockThreshold', Number(process.env.STOCK_ALERT_THRESHOLD) || 8] },
          ],
        },
      }),
      Order.countDocuments({ status: 'en_attente' }),
      Sale.aggregate([{ $group: { _id: null, total: { $sum: netTotalExpression } } }]),
    ]);

  const total = revenue[0]?.total || 0;
  const count = revenue[0]?.count || 0;

  res.json({
    success: true,
    data: {
      period,
      revenue: total,
      salesCount: count,
      averageBasket: count ? total / count : 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      todayRevenue: todayRevenue[0]?.total || 0,
      todaySalesCount: todayRevenue[0]?.count || 0,
      productCount,
      lowStockCount,
      pendingOrders,
    },
  });
});

/**
 * GET /api/dashboard/sales-chart?period=7d|30d|year
 */
const salesChart = asyncHandler(async (req, res) => {
  const period = req.query.period || '7d';
  const { start, end } = getPeriodRange(period, req.query.date);

  const sales = await Sale.find({ date: { $gte: start, $lte: end } }).select('date payment total');

  const buckets = new Map();

  if (period === 'year') {
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, {
        day: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(cursor),
        especes: 0,
        carte: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = localDateKey(cursor);
      buckets.set(key, {
        day: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(cursor),
        especes: 0,
        carte: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  sales.forEach((sale) => {
    const key =
      period === 'year'
        ? `${sale.date.getFullYear()}-${String(sale.date.getMonth() + 1).padStart(2, '0')}`
        : localDateKey(sale.date);

    const bucket = buckets.get(key);
    if (bucket) bucket[sale.payment] += netTotalOf(sale);
  });

  res.json({ success: true, data: [...buckets.values()] });
});

/**
 * GET /api/dashboard/top-products?period=7d
 */
const topProducts = asyncHandler(async (req, res) => {
  const period = req.query.period || '7d';
  const { start, end } = getPeriodRange(period, req.query.date);

  const rows = await Sale.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    { $unwind: '$lines' },
    {
      $group: {
        _id: '$lines.name',
        quantity: { $sum: '$lines.quantity' },
        revenue: { $sum: { $multiply: ['$lines.price', '$lines.quantity'] } },
      },
    },
    { $sort: { quantity: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, name: '$_id', quantity: 1, revenue: 1 } },
  ]);

  res.json({ success: true, data: rows });
});

/**
 * GET /api/dashboard/cash-register?period=day|week|month&date=YYYY-MM-DD
 */
const cashRegister = asyncHandler(async (req, res) => {
  const period = req.query.period || 'day';
  const { start, end } = getPeriodRange(period, req.query.date);

  const sales = await Sale.find({ date: { $gte: start, $lte: end } })
    .populate('cashier', 'name')
    .sort({ date: 1 });

  const cashTotal = sales
    .filter((sale) => sale.payment === 'especes')
    .reduce((total, sale) => total + netTotalOf(sale), 0);

  const cardTotal = sales
    .filter((sale) => sale.payment === 'carte')
    .reduce((total, sale) => total + netTotalOf(sale), 0);

  const byCashierMap = new Map();
  sales.forEach((sale) => {
    const name = sale.cashier?.name || 'Inconnu';
    if (!byCashierMap.has(name)) {
      byCashierMap.set(name, { cashier: name, sales: 0, especes: 0, carte: 0, total: 0 });
    }
    const row = byCashierMap.get(name);
    const netTotal = netTotalOf(sale);
    row.sales += 1;
    row[sale.payment] += netTotal;
    row.total += netTotal;
  });

  const revenueMap = new Map();
  sales.forEach((sale) => {
    const key =
      period === 'day'
        ? `${String(sale.date.getHours()).padStart(2, '0')}:00`
        : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(sale.date);

    revenueMap.set(key, (revenueMap.get(key) || 0) + netTotalOf(sale));
  });

  const dailyRevenue = [...revenueMap.entries()].map(([label, total]) => ({ label, total }));

  res.json({
    success: true,
    data: {
      sales: sales.map(serializeSale),
      summary: {
        cashTotal,
        cardTotal,
        grandTotal: cashTotal + cardTotal,
        count: sales.length,
      },
      byCashier: [...byCashierMap.values()],
      dailyRevenue,
    },
  });
});

/**
 * GET /api/dashboard/export?format=pdf|excel&period=7d
 */
const exportReport = asyncHandler(async (req, res) => {
  const format = req.query.format === 'excel' ? 'excel' : 'pdf';
  const period = req.query.period || '7d';
  const { start, end } = getPeriodRange(period, req.query.date);

  const sales = await Sale.find({ date: { $gte: start, $lte: end } })
    .populate('cashier', 'name')
    .sort({ date: 1 });

  const total = sales.reduce((sum, sale) => sum + netTotalOf(sale), 0);
  const filename = `rapport-${period}-${new Date().toISOString().slice(0, 10)}`;

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ventes');

    sheet.columns = [
      { header: 'Facture', key: 'invoice', width: 18 },
      { header: 'Date', key: 'date', width: 22 },
      { header: 'Caissier', key: 'cashier', width: 22 },
      { header: 'Paiement', key: 'payment', width: 16 },
      { header: 'Total', key: 'total', width: 14 },
    ];

    sales.forEach((sale) => {
      sheet.addRow({
        invoice: sale.invoice,
        date: new Date(sale.date).toLocaleString('fr-FR'),
        cashier: sale.cashier?.name || '—',
        payment: sale.payment === 'especes' ? 'Espèces' : 'Carte',
        total: netTotalOf(sale),
      });
    });

    sheet.addRow({ invoice: 'TOTAL', total });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text('SmartStore');
  doc.fontSize(10).fillColor('#555').text(`Rapport des ventes — ${period}`);
  doc.moveDown();

  sales.forEach((sale) => {
    doc
      .fillColor('#000')
      .fontSize(10)
      .text(
        `${sale.invoice} · ${new Date(sale.date).toLocaleString('fr-FR')} · ${
          sale.cashier?.name || '—'
        } · ${netTotalOf(sale).toFixed(3)} DT`
      );
  });

  doc.moveDown();
  doc.fontSize(12).text(`Total : ${total.toFixed(3)} DT`, { align: 'right' });
  doc.end();
});

module.exports = { stats, salesChart, topProducts, cashRegister, exportReport };
