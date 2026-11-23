const router = require('express').Router();
const controller = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect, authorize('admin', 'gestionnaire'));

router.get('/stats', controller.stats);
router.get('/sales-chart', controller.salesChart);
router.get('/top-products', controller.topProducts);
router.get('/cash-register', controller.cashRegister);
router.get('/export', controller.exportReport);

module.exports = router;
