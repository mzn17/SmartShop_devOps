const router = require('express').Router();
const controller = require('../controllers/category.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.route('/')
  .get(controller.list)
  .post(authorize('admin', 'gestionnaire'), controller.create);

router.route('/:id')
  .put(authorize('admin', 'gestionnaire'), controller.update)
  .delete(authorize('admin'), controller.remove);

module.exports = router;
