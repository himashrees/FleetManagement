const router = require('express').Router();
const ctrl = require('../controllers/gps.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { isManager } = require('../middlewares/role.middleware');

router.post('/push',       isAuthenticated, ctrl.pushLocation);
router.get('/live',        isAuthenticated, ctrl.getAllLatestPositions);
router.get('/history/:id', isAuthenticated, ctrl.getVehicleHistory);

// Simulator controls (demo/dev only — stands in for real GPS hardware)
router.get('/simulator/status', isAuthenticated,            ctrl.simulatorStatus);
router.post('/simulator/start', isAuthenticated, isManager, ctrl.startSimulator);
router.post('/simulator/stop',  isAuthenticated, isManager, ctrl.stopSimulator);

module.exports = router;