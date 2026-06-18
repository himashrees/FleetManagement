const router  = require('express').Router();
const ctrl    = require('../controllers/document.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { isManager } = require('../middlewares/role.middleware');
const multer  = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/',         isAuthenticated,                        ctrl.getAll);
router.get('/expiring', isAuthenticated,                        ctrl.getExpiringDocuments);
router.post('/',        isAuthenticated, upload.single('file'), ctrl.upload);
router.delete('/:id',   isAuthenticated, isManager,              ctrl.remove);

module.exports = router;