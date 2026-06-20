// const router  = require('express').Router();
// const ctrl    = require('../controllers/document.controller');
// const { isAuthenticated } = require('../middlewares/auth.middleware');
// const { isManager } = require('../middlewares/role.middleware');
// const multer  = require('multer');

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, 'uploads/'),
//   filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
// });
// const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// router.get('/',         isAuthenticated,                        ctrl.getAll);
// router.get('/expiring', isAuthenticated,                        ctrl.getExpiringDocuments);
// router.post('/',        isAuthenticated, upload.single('file'), ctrl.upload);
// router.delete('/:id',   isAuthenticated, isManager,              ctrl.remove);

// module.exports = router;





// const router  = require('express').Router();
// const ctrl    = require('../controllers/document.controller');
// const { isAuthenticated } = require('../middlewares/auth.middleware');
// const { isManager } = require('../middlewares/role.middleware');
// const multer  = require('multer');

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, 'uploads/'),
//   filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
// });
// const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// // Temp upload for extraction only (goes to /tmp, deleted after)
// const tmpUpload = multer({
//   storage: multer.diskStorage({
//     destination: (req, file, cb) => cb(null, '/tmp'),
//     filename:    (req, file, cb) => cb(null, `extract_${Date.now()}_${file.originalname}`),
//   }),
//   limits: { fileSize: 10 * 1024 * 1024 },
// });

// router.get('/',              isAuthenticated,                           ctrl.getAll);
// router.get('/expiring',      isAuthenticated,                           ctrl.getExpiringDocuments);
// router.post('/extract-dates',isAuthenticated, tmpUpload.single('file'), ctrl.extractDates);  // ← new
// router.post('/',             isAuthenticated, upload.single('file'),    ctrl.upload);
// router.delete('/:id',        isAuthenticated, isManager,                ctrl.remove);

// module.exports = router;

const os      = require('os');
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

const tmpUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),  // ← fixed
    filename:    (req, file, cb) => cb(null, `extract_${Date.now()}_${file.originalname}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/',               isAuthenticated,                           ctrl.getAll);
router.get('/expiring',       isAuthenticated,                           ctrl.getExpiringDocuments);
router.post('/extract-dates', isAuthenticated, tmpUpload.single('file'), ctrl.extractDates);
router.post('/',              isAuthenticated, upload.single('file'),    ctrl.upload);
router.delete('/:id',         isAuthenticated, isManager,                ctrl.remove);

module.exports = router;
