const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/role.middleware');

// All user management routes require admin access
router.get('/',                    isAuthenticated, isAdmin, ctrl.getAll);
router.get('/:id',                 isAuthenticated, isAdmin, ctrl.getById);
router.post('/',                   isAuthenticated, isAdmin, ctrl.create);
router.put('/:id',                 isAuthenticated, isAdmin, ctrl.update);
router.put('/:id/toggle-active',   isAuthenticated, isAdmin, ctrl.toggleActive);
router.put('/:id/reset-password',  isAuthenticated, isAdmin, ctrl.adminResetPassword);
router.put('/:id/role',            isAuthenticated, isAdmin, ctrl.assignRole);
router.delete('/:id',              isAuthenticated, isAdmin, ctrl.remove);

module.exports = router;