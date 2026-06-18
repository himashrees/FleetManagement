const router = require('express').Router();
const ctrl = require('../controllers/gps.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

router.post('/push',       ctrl.pushLocation);
router.get('/live',        isAuthenticated, ctrl.getAllLatestPositions);
router.get('/history/:id', isAuthenticated, ctrl.getVehicleHistory);

module.exports = router;