const router = require('express').Router();
const controller = require('../controllers/stock.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect, authorize('admin', 'gestionnaire'));

router.route('/movements')
  .get(controller.listMovements)
  .post(controller.createMovement);

module.exports = router;
