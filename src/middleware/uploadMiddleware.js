const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../utils/errorHandler');

/* ============ Ensure upload directories exist ============ */
const ensureUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/avatars'),
    path.join(__dirname, '../../uploads/campaigns'),
    path.join(__dirname, '../../uploads/documents'),
    path.join(__dirname, '../../uploads/reports'),
    path.join(__dirname, '../../uploads/certificates'),
    path.join(__dirname, '../../uploads/updates'), // NEW: ảnh cập nhật tiến trình
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created upload directory: ${dir}`);
    }
  });
};
// Call this on startup
ensureUploadDirs();

/* ============ Storages ============ */
const createAvatarStorage = () =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/avatars')),
    filename: (req, file, cb) => {
      const userId = req.user?.user_id || 'unknown';
      const ext = path.extname(file.originalname);
      cb(null, `${userId}-${Date.now()}-${Math.floor(Math.random() * 1e9)}${ext}`);
    },
  });

const createCampaignStorage = () =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/campaigns')),
    filename: (req, file, cb) => {
      const userId = req.user?.user_id || 'unknown';
      const ext = path.extname(file.originalname);
      cb(null, `campaign_${userId}-${Date.now()}-${Math.floor(Math.random() * 1e9)}${ext}`);
    },
  });

const createDocumentStorage = () =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/documents')),
    filename: (req, file, cb) => {
      const userId = req.user?.user_id || 'unknown';
      const ext = path.extname(file.originalname);
      cb(null, `doc_${userId}-${Date.now()}-${Math.floor(Math.random() * 1e9)}${ext}`);
    },
  });

const createCertificateStorage = () =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/certificates')),
    filename: (req, file, cb) => {
      const userId = req.user?.user_id || 'unknown';
      const ext = path.extname(file.originalname);
      cb(null, `cert_${userId}-${Date.now()}-${Math.floor(Math.random() * 1e9)}${ext}`);
    },
  });

const createReportStorage = () =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/reports')),
    filename: (req, file, cb) => {
      const userId = req.user?.user_id || 'unknown';
      const ext = path.extname(file.originalname);
      cb(null, `report_${userId}-${Date.now()}-${Math.floor(Math.random() * 1e9)}${ext}`);
    },
  });

/* NEW: storage cho ảnh cập nhật tiến trình */
const createUpdatesStorage = () =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/updates')),
    filename: (req, file, cb) => {
      const userId = req.user?.user_id || 'unknown';
      const ext = path.extname(file.originalname);
      cb(null, `update_${userId}-${Date.now()}-${Math.floor(Math.random() * 1e9)}${ext}`);
    },
  });

/* ============ File filters ============ */
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype?.startsWith('image/')) return cb(null, true);
  cb(new AppError('Chỉ chấp nhận file hình ảnh', 400), false);
};

const documentFileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new AppError('Chỉ chấp nhận file PDF, DOC, DOCX hoặc hình ảnh', 400), false);
};

const certificateFileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'image/webp',
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new AppError('Chỉ chấp nhận file PDF, DOC, DOCX hoặc hình ảnh (JPEG, PNG, JPG, GIF, WebP)', 400), false);
};

/* ============ Upload factories ============ */
const createAvatarUpload = () =>
  multer({ storage: createAvatarStorage(), fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const createCampaignUpload = () =>
  multer({ storage: createCampaignStorage(), fileFilter: imageFileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const createDocumentUpload = () =>
  multer({ storage: createDocumentStorage(), fileFilter: documentFileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

const createCertificateUpload = () =>
  multer({ storage: createCertificateStorage(), fileFilter: certificateFileFilter, limits: { fileSize: 15 * 1024 * 1024 } });

const createReportUpload = () =>
  multer({ storage: createReportStorage(), fileFilter: documentFileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

/* NEW: uploader cho ảnh cập nhật tiến trình */
const createUpdatesUpload = () =>
  multer({ storage: createUpdatesStorage(), fileFilter: imageFileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

/* ============ Middleware instances ============ */
const uploadAvatar = createAvatarUpload().single('avatar');
const uploadCampaignImages = createCampaignUpload().array('images', 10); // ↑ tăng lên 10
const uploadCampaignSingleImage = createCampaignUpload().single('image');
const uploadQrImage = createCampaignUpload().single('qr_image');

const uploadDocument = createDocumentUpload().single('document');
const uploadCertificates = createCertificateUpload().array('certificates', 5);
const uploadReport = createReportUpload().single('report');

/* NEW: upload ảnh updates */
const uploadUpdateImages = createUpdatesUpload().array('images', 10);

/* ============ Multer error handler ============ */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ status: 'error', message: 'File quá lớn' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ status: 'error', message: 'Quá nhiều file' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ status: 'error', message: `Tên field không đúng: ${err.field || 'unknown'}` });
    }
    return res.status(400).json({ status: 'error', message: 'Lỗi upload file' });
  }
  if (err) return res.status(400).json({ status: 'error', message: err.message });
  next();
};

module.exports = {
  // single-use middlewares
  uploadAvatar,
  uploadCampaignImages,
  uploadCampaignSingleImage,
  uploadQrImage,
  uploadDocument,
  uploadCertificates,
  uploadReport,
  uploadUpdateImages, // NEW

  // factories
  createAvatarUpload,
  createCampaignUpload,
  createDocumentUpload,
  createCertificateUpload,
  createReportUpload,
  createUpdatesUpload, // NEW

  ensureUploadDirs,
  handleMulterError,
};
