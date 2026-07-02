const router = require('express').Router();
const ctrl = require('../controllers/maintenance.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { isManager } = require('../middlewares/role.middleware');

router.get('/',          isAuthenticated,            ctrl.getAll);
router.get('/upcoming',  isAuthenticated,            ctrl.getUpcoming);
router.get('/predict/:vehicleId', isAuthenticated, ctrl.getPrediction);
router.post('/',         isAuthenticated, isManager, ctrl.create);
router.put('/:id',       isAuthenticated, isManager, ctrl.update);
router.delete('/:id',    isAuthenticated, isManager, ctrl.remove);

module.exports = router;