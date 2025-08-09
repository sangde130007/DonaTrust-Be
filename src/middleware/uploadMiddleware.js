const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../utils/errorHandler');

// Ensure upload directories exist
const ensureUploadDirs = () => {
	const dirs = [
		path.join(__dirname, '../../uploads'),
		path.join(__dirname, '../../uploads/avatars'),
		path.join(__dirname, '../../uploads/campaigns'),
		path.join(__dirname, '../../uploads/documents'),
		path.join(__dirname, '../../uploads/reports'),
		path.join(__dirname, '../../uploads/certificates'),
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

// Configure storage for avatars
const createAvatarStorage = () => {
	return multer.diskStorage({
		destination: function (req, file, cb) {
			cb(null, path.join(__dirname, '../../uploads/avatars'));
		},
		filename: function (req, file, cb) {
			const userId = req.user?.user_id || 'unknown';
			const timestamp = Date.now();
			const random = Math.floor(Math.random() * 1000000000);
			const ext = path.extname(file.originalname);
			cb(null, `${userId}-${timestamp}-${random}${ext}`);
		},
	});
};

// Configure storage for campaigns
const createCampaignStorage = () => {
	return multer.diskStorage({
		destination: function (req, file, cb) {
			cb(null, path.join(__dirname, '../../uploads/campaigns'));
		},
		filename: function (req, file, cb) {
			const userId = req.user?.user_id || 'unknown';
			const timestamp = Date.now();
			const random = Math.floor(Math.random() * 1000000000);
			const ext = path.extname(file.originalname);
			cb(null, `campaign_${userId}-${timestamp}-${random}${ext}`);
		},
	});
};

// Configure storage for documents
const createDocumentStorage = () => {
	return multer.diskStorage({
		destination: function (req, file, cb) {
			cb(null, path.join(__dirname, '../../uploads/documents'));
		},
		filename: function (req, file, cb) {
			const userId = req.user?.user_id || 'unknown';
			const timestamp = Date.now();
			const random = Math.floor(Math.random() * 1000000000);
			const ext = path.extname(file.originalname);
			cb(null, `doc_${userId}-${timestamp}-${random}${ext}`);
		},
	});
};

// Configure storage for certificates (DAO applications)
const createCertificateStorage = () => {
	return multer.diskStorage({
		destination: function (req, file, cb) {
			cb(null, path.join(__dirname, '../../uploads/certificates'));
		},
		filename: function (req, file, cb) {
			const userId = req.user?.user_id || 'unknown';
			const timestamp = Date.now();
			const random = Math.floor(Math.random() * 1000000000);
			const ext = path.extname(file.originalname);
			cb(null, `cert_${userId}-${timestamp}-${random}${ext}`);
		},
	});
};

// Configure storage for reports
const createReportStorage = () => {
	return multer.diskStorage({
		destination: function (req, file, cb) {
			cb(null, path.join(__dirname, '../../uploads/reports'));
		},
		filename: function (req, file, cb) {
			const userId = req.user?.user_id || 'unknown';
			const timestamp = Date.now();
			const random = Math.floor(Math.random() * 1000000000);
			const ext = path.extname(file.originalname);
			cb(null, `report_${userId}-${timestamp}-${random}${ext}`);
		},
	});
};

// File filter for images
const imageFileFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image/')) {
		cb(null, true);
	} else {
		cb(new AppError('Chỉ chấp nhận file hình ảnh', 400), false);
	}
};

// File filter for documents (PDF, DOC, DOCX)
const documentFileFilter = (req, file, cb) => {
	const allowedTypes = [
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'image/jpeg',
		'image/png',
		'image/jpg',
	];

	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new AppError('Chỉ chấp nhận file PDF, DOC, DOCX hoặc hình ảnh', 400), false);
	}
};

// File filter for certificates (similar to documents but more permissive)
const certificateFileFilter = (req, file, cb) => {
	const allowedTypes = [
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'image/jpeg',
		'image/png',
		'image/jpg',
		'image/gif',
		'image/webp',
	];

	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new AppError('Chỉ chấp nhận file PDF, DOC, DOCX hoặc hình ảnh (JPEG, PNG, JPG, GIF, WebP)', 400), false);
	}
};

// Create upload instances
const createAvatarUpload = () => {
	return multer({
		storage: createAvatarStorage(),
		fileFilter: imageFileFilter,
		limits: {
			fileSize: 5 * 1024 * 1024, // 5MB
		},
	});
};

const createCampaignUpload = () => {
	return multer({
		storage: createCampaignStorage(),
		fileFilter: imageFileFilter,
		limits: {
			fileSize: 10 * 1024 * 1024, // 10MB
		},
	});
};

const createDocumentUpload = () => {
	return multer({
		storage: createDocumentStorage(),
		fileFilter: documentFileFilter,
		limits: {
			fileSize: 20 * 1024 * 1024, // 20MB
		},
	});
};

const createCertificateUpload = () => {
	return multer({
		storage: createCertificateStorage(),
		fileFilter: certificateFileFilter,
		limits: {
			fileSize: 15 * 1024 * 1024, // 15MB per file
		},
	});
};

const createReportUpload = () => {
	return multer({
		storage: createReportStorage(),
		fileFilter: documentFileFilter,
		limits: {
			fileSize: 50 * 1024 * 1024, // 50MB
		},
	});
};

// Middleware instances
const uploadAvatar = createAvatarUpload().single('avatar');
const uploadCampaignImages = createCampaignUpload().array('images', 5);
const uploadCampaignSingleImage = createCampaignUpload().single('image');
const uploadDocument = createDocumentUpload().single('document');
const uploadCertificates = createCertificateUpload().array('certificates', 5); // Up to 5 certificates
const uploadReport = createReportUpload().single('report');
const uploadQrImage = createCampaignUpload().single('qr_image');

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
	if (err instanceof multer.MulterError) {
		if (err.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({
				status: 'error',
				message: 'File quá lớn',
			});
		}
		if (err.code === 'LIMIT_FILE_COUNT') {
			return res.status(400).json({
				status: 'error',
				message: 'Quá nhiều file',
			});
		}
		 if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      status: 'error',
      message: `Tên field không đúng: ${err.field || 'unknown'}`,
    });
  }
		return res.status(400).json({
			status: 'error',
			message: 'Lỗi upload file',
		});
	}
	if (err) {
		return res.status(400).json({
			status: 'error',
			message: err.message,
		});
	}
	next();
};

module.exports = {
	uploadAvatar,
	uploadCampaignImages,
	uploadCampaignSingleImage,
	  uploadQrImage,               
	uploadDocument,
	uploadCertificates,
	uploadReport,
	createAvatarUpload,
	createCampaignUpload,
	createDocumentUpload,
	createCertificateUpload,
	createReportUpload,
	ensureUploadDirs,
	handleMulterError,
};
