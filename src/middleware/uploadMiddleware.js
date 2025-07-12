const multer = require('multer');
const path = require('path');
const { AppError } = require('../utils/errorHandler');

// Cấu hình upload cho avatar
const createAvatarUpload = () => {
	const storage = multer.diskStorage({
		destination: function (req, file, cb) {
			const uploadPath = path.join(__dirname, '../../uploads/avatars');
			cb(null, uploadPath);
		},
		filename: function (req, file, cb) {
			const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
			const ext = path.extname(file.originalname);
			cb(null, `${req.user.user_id}-${uniqueSuffix}${ext}`);
		},
	});

	return multer({
		storage: storage,
		limits: {
			fileSize: 5 * 1024 * 1024, // 5MB
		},
		fileFilter: function (req, file, cb) {
			if (file.mimetype.startsWith('image/')) {
				cb(null, true);
			} else {
				cb(new Error('Chỉ cho phép upload file ảnh (JPEG, PNG, GIF, WebP)'), false);
			}
		},
	});
};

// Cấu hình upload cho campaign images
const createCampaignUpload = () => {
	const storage = multer.diskStorage({
		destination: function (req, file, cb) {
			const uploadPath = path.join(__dirname, '../../uploads/campaigns');
			cb(null, uploadPath);
		},
		filename: function (req, file, cb) {
			const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
			const ext = path.extname(file.originalname);
			const campaignId = req.params.id || 'new';
			cb(null, `campaign-${campaignId}-${uniqueSuffix}${ext}`);
		},
	});

	return multer({
		storage: storage,
		limits: {
			fileSize: 10 * 1024 * 1024, // 10MB cho campaign images
		},
		fileFilter: function (req, file, cb) {
			if (file.mimetype.startsWith('image/')) {
				cb(null, true);
			} else {
				cb(new Error('Chỉ cho phép upload file ảnh cho chiến dịch'), false);
			}
		},
	});
};

// Cấu hình upload cho documents (PDF, DOC, etc.)
const createDocumentUpload = () => {
	const storage = multer.diskStorage({
		destination: function (req, file, cb) {
			const uploadPath = path.join(__dirname, '../../uploads/documents');
			cb(null, uploadPath);
		},
		filename: function (req, file, cb) {
			const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
			const ext = path.extname(file.originalname);
			cb(null, `${req.user.user_id}-doc-${uniqueSuffix}${ext}`);
		},
	});

	return multer({
		storage: storage,
		limits: {
			fileSize: 20 * 1024 * 1024, // 20MB cho documents
		},
		fileFilter: function (req, file, cb) {
			const allowedTypes = [
				'application/pdf',
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'image/jpeg',
				'image/png',
				'image/gif',
			];

			if (allowedTypes.includes(file.mimetype)) {
				cb(null, true);
			} else {
				cb(new Error('Chỉ cho phép upload PDF, DOC, DOCX hoặc file ảnh'), false);
			}
		},
	});
};

// Cấu hình upload cho reports
const createReportUpload = () => {
	const storage = multer.diskStorage({
		destination: function (req, file, cb) {
			const uploadPath = path.join(__dirname, '../../uploads/reports');
			cb(null, uploadPath);
		},
		filename: function (req, file, cb) {
			const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
			const ext = path.extname(file.originalname);
			cb(null, `report-${req.user.user_id}-${uniqueSuffix}${ext}`);
		},
	});

	return multer({
		storage: storage,
		limits: {
			fileSize: 50 * 1024 * 1024, // 50MB cho reports
		},
		fileFilter: function (req, file, cb) {
			const allowedTypes = [
				'application/pdf',
				'application/vnd.ms-excel',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			];

			if (allowedTypes.includes(file.mimetype)) {
				cb(null, true);
			} else {
				cb(new Error('Chỉ cho phép upload PDF, XLS, XLSX cho báo cáo'), false);
			}
		},
	});
};

// Middleware functions
const uploadAvatar = (req, res, next) => {
	const upload = createAvatarUpload();
	upload.single('avatar')(req, res, next);
};

const uploadCampaignImages = (req, res, next) => {
	const upload = createCampaignUpload();
	upload.array('images', 5)(req, res, next); // Tối đa 5 ảnh
};

const uploadCampaignSingleImage = (req, res, next) => {
	const upload = createCampaignUpload();
	upload.single('image')(req, res, next);
};

const uploadDocument = (req, res, next) => {
	const upload = createDocumentUpload();
	upload.single('document')(req, res, next);
};

const uploadReport = (req, res, next) => {
	const upload = createReportUpload();
	upload.single('report')(req, res, next);
};

module.exports = {
	uploadAvatar,
	uploadCampaignImages,
	uploadCampaignSingleImage,
	uploadDocument,
	uploadReport,
	createAvatarUpload,
	createCampaignUpload,
	createDocumentUpload,
	createReportUpload,
};
