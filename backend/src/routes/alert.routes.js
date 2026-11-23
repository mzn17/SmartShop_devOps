// src/routes/alert.routes.js
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { generateFromAlerts } = require('../controllers/alert.controller');

router.post('/generate', protect, authorize('admin'), generateFromAlerts);

module.exports = router;
