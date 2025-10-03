const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../utils/errorHandler');
const { 
  cloudinary,
  uploadAvatar: cloudinaryUploadAvatar,
  uploadCampaign: cloudinaryUploadCampaign,
  uploadCertificate: cloudinaryUploadCertificate,
  uploadDocument: cloudinaryUploadDocument,
  uploadReport: cloudinaryUploadReport,
  uploadUpdate: cloudinaryUploadUpdate
} = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/* ============ Ensure upload directories exist ============ */
const ensureUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/avatars'),
    path.join(__dirname, '../../uploads/campaigns'),
    path.join(__dirname, '../../uploads/documents'),
    path.join(__dirname, '../../uploads/reports'),
    path.join(__dirname, '../../uploads/certificates'),
    path.join(__dirname, '../../uploads/updates'),
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

const createUpdatesStorage = () => multer.memoryStorage();


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

/* ===== Charity Registration: license, description, logo ===== */
const createCharityRegistrationStorage = () =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      let dir;
      switch (file.fieldname) {
        case 'license':
          dir = path.join(__dirname, '../../uploads/certificates');
          break;
        case 'description':
          dir = path.join(__dirname, '../../uploads/documents');
          break;
        case 'logo':
          dir = path.join(__dirname, '../../uploads/avatars');
          break;
        default:
          dir = path.join(__dirname, '../../uploads/documents');
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const userId = req.user?.user_id || 'unknown';
      const ext = path.extname(file.originalname);
      const safeName = file.fieldname || 'file';
      cb(null, `charity_${safeName}_${userId}-${Date.now()}-${Math.floor(Math.random() * 1e9)}${ext}`);
    },
  });

const charityRegistrationFileFilter = (req, file, cb) => {
  if (file.fieldname === 'logo') {
    return imageFileFilter(req, file, cb);
  }
  return documentFileFilter(req, file, cb);
};

const createCharityRegistrationUpload = () =>
  multer({
    storage: createCharityRegistrationStorage(),
    fileFilter: charityRegistrationFileFilter,
    limits: { fileSize: 20 * 1024 * 1024 },
  });

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

const createUpdatesUpload = () =>
  multer({ storage: createUpdatesStorage(), fileFilter: imageFileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

/* ============ Middleware instances ============ */
// Cloudinary uploads
const uploadAvatar = cloudinaryUploadAvatar.single('avatar');
const uploadCampaignImages = cloudinaryUploadCampaign.array('images', 10);
const uploadCampaignSingleImage = cloudinaryUploadCampaign.single('image');
const uploadQrImage = cloudinaryUploadCampaign.single('qr_image');

const uploadDocument = cloudinaryUploadDocument.single('document');
const uploadCertificates = cloudinaryUploadCertificate.array('certificates', 5);
const uploadReport = cloudinaryUploadReport.single('report');
const uploadReportFiles = cloudinaryUploadReport.array('evidence_files', 5);
const uploadUpdateImages = cloudinaryUploadUpdate.array('images', 10);

// Fallback local uploads (for development or when Cloudinary is not available)
const uploadAvatarLocal = createAvatarUpload().single('avatar');
const uploadCampaignImagesLocal = createCampaignUpload().array('images', 10);
const uploadCampaignSingleImageLocal = createCampaignUpload().single('image');
const uploadQrImageLocal = createCampaignUpload().single('qr_image');

const uploadDocumentLocal = createDocumentUpload().single('document');
const uploadCertificatesLocal = createCertificateUpload().array('certificates', 5);
const uploadReportLocal = createReportUpload().single('report');
const uploadReportFilesLocal = createReportUpload().array('evidence_files', 5);
const uploadUpdateImagesLocal = createUpdatesUpload().array('images', 10);

/* ===== Instance: upload cho Charity Registration ===== */
// Use Cloudinary for charity registration
const uploadCharityRegistration = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'donatrust/charity-registration',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx'],
      transformation: [
        { quality: 'auto' }
      ],
      public_id: (req, file) => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        return `charity_${file.fieldname}_${timestamp}_${randomString}`;
      }
    }
  }),
  fileFilter: charityRegistrationFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
}).fields([
  { name: 'license', maxCount: 1 },
  { name: 'description', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
]);

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
  // Cloudinary uploads (primary)
  uploadAvatar,
  uploadCampaignImages,
  uploadCampaignSingleImage,
  uploadQrImage,
  uploadDocument,
  uploadCertificates,
  uploadReport,
  uploadUpdateImages,
  uploadReportFiles,

  // Local uploads (fallback)
  uploadAvatarLocal,
  uploadCampaignImagesLocal,
  uploadCampaignSingleImageLocal,
  uploadQrImageLocal,
  uploadDocumentLocal,
  uploadCertificatesLocal,
  uploadReportLocal,
  uploadUpdateImagesLocal,
  uploadReportFilesLocal,

  // factories
  createAvatarUpload,
  createCampaignUpload,
  createDocumentUpload,
  createCertificateUpload,
  createReportUpload,
  createUpdatesUpload,

  // charity registration
  uploadCharityRegistration,
  createCharityRegistrationUpload,

  ensureUploadDirs,
  handleMulterError,
};
