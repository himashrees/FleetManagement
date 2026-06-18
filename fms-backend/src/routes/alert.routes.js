const router = require('express').Router();
const ctrl = require('../controllers/alert.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

router.get('/',              isAuthenticated, ctrl.getAll);
router.post('/',             isAuthenticated, ctrl.create);
router.post('/check-expiry', isAuthenticated, ctrl.checkExpiry);
router.put('/:id/read',      isAuthenticated, ctrl.markRead);
router.put('/read-all',      isAuthenticated, ctrl.markAllRead);

module.exports = router;