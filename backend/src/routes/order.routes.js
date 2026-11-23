const router = require('express').Router();
const controller = require('../controllers/order.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect, authorize('admin', 'gestionnaire'));

// La génération et la création manuelle sont réservées à l'administrateur.
// Le gestionnaire de stock consulte les commandes et réceptionne la marchandise.
// Allow admin to manually trigger low‑stock order generation via GET (easier for UI).
router.get('/generate-low-stock', authorize('admin'), controller.generateLowStockOrder);
// Keep POST for backward compatibility.
router.post('/generate-low-stock', authorize('admin'), controller.generateLowStockOrder);

router.route('/')
  .get(controller.list)
  .post(authorize('admin'), controller.create);

router.get('/:id/pdf', controller.downloadPdf);
router.get('/:id', controller.getById);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;
