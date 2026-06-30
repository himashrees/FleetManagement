// routes/report.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/report.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { isManager }       = require('../middlewares/role.middleware');

router.get('/summary',    isAuthenticated, isManager, ctrl.fleetSummary);
router.get('/fuel',       isAuthenticated, isManager, ctrl.fuelReport);
router.get('/trips',      isAuthenticated, isManager, ctrl.tripReport);
router.get('/executive',  isAuthenticated, isManager, ctrl.executiveSummary);  // NEW

module.exports = router;