const router = require('express').Router();
const ctrl = require('../controllers/trip.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { scopeDriverTo } = require('../middlewares/role.middleware');

router.get('/',              isAuthenticated, scopeDriverTo('driver_id'), ctrl.getAll);
router.get('/:id',           isAuthenticated, ctrl.getById);
router.post('/schedule',     isAuthenticated, ctrl.scheduleTrip);   // ← ADD THIS
router.post('/start',        isAuthenticated, ctrl.startTrip);
router.put('/:id/end',       isAuthenticated, ctrl.endTrip);
router.put('/:id/cancel',    isAuthenticated, ctrl.cancelTrip);

module.exports = router;