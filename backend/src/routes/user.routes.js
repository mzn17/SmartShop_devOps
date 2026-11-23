const router = require('express').Router();
const controller = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect, authorize('admin'));

router.route('/')
  .get(controller.list)
  .post(controller.create);

router.route('/:id')
  .put(controller.update)
  .delete(controller.remove);

module.exports = router;
