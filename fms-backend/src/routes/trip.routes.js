const router = require('express').Router();
const ctrl = require('../controllers/trip.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { isManager, scopeDriverTo } = require('../middlewares/role.middleware');

// Admin/Manager see all trips. Drivers only see their own (auto-filtered by driver_id).
router.get('/',           isAuthenticated,             scopeDriverTo('driver_id'), ctrl.getAll);
router.get('/:id',        isAuthenticated,                                         ctrl.getById);
router.post('/',          isAuthenticated, isManager,                              ctrl.createTrip);
router.put('/:id',        isAuthenticated, isManager,                              ctrl.updateTrip);
router.put('/:id/start',  isAuthenticated,                                         ctrl.startTrip);
router.put('/:id/end',    isAuthenticated,                                         ctrl.endTrip);
router.put('/:id/cancel', isAuthenticated, isManager,                              ctrl.cancelTrip);

module.exports = router;