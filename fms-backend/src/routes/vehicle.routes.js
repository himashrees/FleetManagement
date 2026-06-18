const router = require('express').Router();
const ctrl = require('../controllers/vehicle.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { isManager } = require('../middlewares/role.middleware');

router.get('/',       isAuthenticated,            ctrl.getAll);
router.get('/:id',    isAuthenticated,            ctrl.getById);
router.post('/',      isAuthenticated, isManager, ctrl.create);
router.put('/:id',    isAuthenticated, isManager, ctrl.update);
router.delete('/:id', isAuthenticated, isManager, ctrl.remove);

module.exports = router;