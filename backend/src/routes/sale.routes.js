const router = require('express').Router();
const controller = require('../controllers/sale.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

// Les routes fixes doivent être déclarées avant /:id.
router.get('/my', controller.mySales);
router.get('/returns/my', controller.myReturns);
router.get('/returns', authorize('admin'), controller.listReturns);

router.post('/:id/returns', authorize('caissier', 'admin'), controller.createReturn);

router.route('/')
  .get(authorize('admin', 'gestionnaire'), controller.list)
  .post(authorize('caissier', 'admin'), controller.create);

router.get('/:id', controller.getById);

module.exports = router;
