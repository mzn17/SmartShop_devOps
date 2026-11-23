const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/login', controller.login);
router.get('/me', protect, controller.me);
router.post('/logout', protect, controller.logout);

module.exports = router;
