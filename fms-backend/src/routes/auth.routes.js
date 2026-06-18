const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/role.middleware');

router.post('/register',        ctrl.register);
router.post('/register-staff',  isAuthenticated, isAdmin, ctrl.registerStaff);
router.post('/login',           ctrl.login);
router.post('/logout',          isAuthenticated, ctrl.logout);
router.get('/me',               isAuthenticated, ctrl.getMe);
router.put('/change-password',  isAuthenticated, ctrl.changePassword);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);

module.exports = router;