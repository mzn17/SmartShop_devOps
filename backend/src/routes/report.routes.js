// src/routes/report.routes.js
// Reporting endpoints — réservé aux offices de gestion (admin, gestionnaire de stock).

const router = require('express').Router();
const controller = require('../controllers/report.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect, authorize('admin', 'gestionnaire'));

// GET /api/reports/top-products?limit=10
router.get('/top-products', controller.topProducts);

// GET /api/reports/sales-summary
router.get('/sales-summary', controller.salesSummary);

module.exports = router;
