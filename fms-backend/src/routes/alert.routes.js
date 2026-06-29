const router = require('express').Router();
const ctrl   = require('../controllers/alert.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

router.get('/',                isAuthenticated, ctrl.getAll);
router.post('/',               isAuthenticated, ctrl.create);
router.post('/check-expiry',   isAuthenticated, ctrl.checkExpiry);
router.put('/read-all',        isAuthenticated, ctrl.markAllRead);
router.put('/:id/read',        isAuthenticated, ctrl.markRead);
router.put('/:id/assign',      isAuthenticated, ctrl.assignDriver);
router.put('/:id/acknowledge', isAuthenticated, ctrl.acknowledge);
router.put('/:id/resolve',     isAuthenticated, ctrl.resolve);
router.delete('/:id',          isAuthenticated, ctrl.remove);

module.exports = router;