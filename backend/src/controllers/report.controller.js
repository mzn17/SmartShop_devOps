// src/controllers/report.controller.js
// Simple reporting endpoints required by the backlog.
// - topProducts: returns best‑selling products (by total quantity sold).
// - salesReport: aggregates total sales per day (CA evolution).

const Sale = require('../models/Sale');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

/**
 * GET /api/reports/top-products
 * Query params: limit (default 10)
 */
const topProducts = asyncHandler(async (req, res) => {
  const limit = Math.max(1, Number(req.query.limit) || 10);
  // Aggregate quantity sold per product across all validated sales.
  const agg = await Sale.aggregate([
    { $unwind: '$lines' },
    {
      $group: {
        _id: '$lines.product',
        name: { $first: '$lines.name' },
        totalQuantity: { $sum: '$lines.quantity' },
        totalRevenue: { $sum: { $multiply: ['$lines.price', '$lines.quantity'] } },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
  ]);
  res.json({ success: true, data: agg });
});

/**
 * GET /api/reports/sales-summary
 * Returns total sales amount per day for the last 30 days.
 */
const salesSummary = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const agg = await Sale.aggregate([
    { $match: { date: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        total: {
          $sum: { $subtract: ['$total', { $ifNull: ['$refundedTotal', 0] }] },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data: agg });
});

module.exports = { topProducts, salesSummary };
