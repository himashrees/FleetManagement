const router = require('express').Router();
const ctrl = require('../controllers/gps.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

router.post('/push',       isAuthenticated, ctrl.pushLocation);
router.get('/live',        isAuthenticated, ctrl.getAllLatestPositions);
router.get('/history/:id', isAuthenticated, ctrl.getVehicleHistory);

// Simulator controls (demo/dev only — stands in for real GPS hardware).
// Open to any logged-in user — no manager/admin gate — since this just
// toggles the in-memory demo simulator, not real fleet data.
router.get('/simulator/status', isAuthenticated, ctrl.simulatorStatus);
router.post('/simulator/start', isAuthenticated, ctrl.startSimulator);
router.post('/simulator/stop',  isAuthenticated, ctrl.stopSimulator);

module.exports = router;