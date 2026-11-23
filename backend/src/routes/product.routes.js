const router = require('express').Router();
const controller = require('../controllers/product.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/low-stock', controller.listLowStock);
router.get('/barcode/:code', controller.getByBarcode);

router.route('/')
  .get(controller.list)
  .post(authorize('admin', 'gestionnaire'), controller.create);

router.route('/:id')
  .get(controller.getById)
  .put(authorize('admin', 'gestionnaire'), controller.update)
  .delete(authorize('admin'), controller.remove);

module.exports = router;
