const router = require('express').Router();
const ctrl = require('../controllers/trip.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { scopeDriverTo } = require('../middlewares/role.middleware');

// Admin/Manager see all trips. Drivers only see their own (auto-filtered by driver_id).
router.get('/',        isAuthenticated, scopeDriverTo('driver_id'), ctrl.getAll);
router.get('/:id',     isAuthenticated,                             ctrl.getById);
router.post('/start',  isAuthenticated,                             ctrl.startTrip);
router.put('/:id/end', isAuthenticated,                             ctrl.endTrip);

module.exports = router;