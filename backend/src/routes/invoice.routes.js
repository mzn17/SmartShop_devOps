const router = require('express').Router();
const controller = require('../controllers/invoice.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', controller.list);
router.get('/:id/pdf', controller.downloadPdf);
router.get('/:id', controller.getById);

module.exports = router;
