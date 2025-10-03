// src/controllers/charityController.js
const { check } = require('express-validator');
const path = require('path');
const multer = require('multer');

const sequelize = require('../config/database');
const Charity = require('../models/Charity');
const User = require('../models/User');
const Notification = require('../models/Notification'); // <- thêm
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const charityService = require('../services/charityService');
const campaignService = require('../services/campaignService');
const financialReportService = require('../services/financialReportService');
const validate = require('../middleware/validationMiddleware');
const { requireCharityOwnership, requireCharity } = require('../middleware/roleMiddleware');
const { uploadQrImage, uploadDocument, handleMulterError } = require('../middleware/uploadMiddleware');
const { cleanupOldImage } = require('../utils/cloudinaryHelper');

/* ======================= Helpers ======================= */

// Chuẩn hoá body khi FE gửi multipart với field "data" chứa JSON
const normalizeRegistrationBody = (req, _res, next) => {
  if (req.body && typeof req.body.data === 'string') {
    try {
      const parsed = JSON.parse(req.body.data);
      req.body = { ...parsed, _raw: req.body };
    } catch {
      // ignore
    }
  }
  next();
};

// Build absolute URL từ đường dẫn tương đối
const toAbsolute = (req, relPath) => {
  if (!relPath) return null;
  const base = process.env.PUBLIC_API_ORIGIN || `${req.protocol}://${req.get('host')}`;
  return relPath.startsWith('http') ? relPath : `${base}${relPath}`;
};

/* ============ Multer cho cập nhật campaign (cover, gallery, qr) ============ */
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');

const uploadCampaignUpdate = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'donatrust/campaigns',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
        { quality: 'auto' }
      ],
      public_id: (req, file) => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        return `campaign_update_${file.fieldname}_${timestamp}_${randomString}`;
      }
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/* ======================= CRUD cơ bản (nếu dùng) ======================= */

exports.create = [
  check('user_id').notEmpty().withMessage('ID người dùng là bắt buộc'),
  check('name').notEmpty().withMessage('Tên tổ chức là bắt buộc'),
  validate,
  async (req, res, next) => {
    try {
      const charity = await charityService.create(req.body);
      res.status(201).json(charity);
    } catch (error) {
      next(error);
    }
  },
];

exports.getAll = async (_req, res, next) => {
  try {
    const charities = await charityService.getAll();
    res.json(charities);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const charity = await charityService.getById(req.params.id);
    res.json(charity);
  } catch (error) {
    next(error);
  }
};

exports.update = [
  check('name').optional().notEmpty().withMessage('Tên tổ chức không được để trống'),
  validate,
  async (req, res, next) => {
    try {
      const charity = await charityService.update(req.params.id, req.body);
      res.json(charity);
    } catch (error) {
      next(error);
    }
  },
];

exports.delete = async (req, res, next) => {
  try {
    await charityService.delete(req.params.id);
    res.json({ message: 'Đã xóa tổ chức từ thiện' });
  } catch (error) {
    next(error);
  }
};

/* ======================= REGISTER CHARITY ======================= */
exports.registerCharity = [
  normalizeRegistrationBody,

  check('name').isLength({ min: 2, max: 200 }).withMessage('Tên tổ chức phải từ 2-200 ký tự'),
  check('description').notEmpty().withMessage('Mô tả không được để trống'),
  check('mission').notEmpty().withMessage('Sứ mệnh không được để trống'),
  check('license_number').notEmpty().withMessage('Số giấy phép không được để trống'),
  check('address').notEmpty().withMessage('Địa chỉ không được để trống'),
  check('city').notEmpty().withMessage('Thành phố không được để trống'),
  check('phone').matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phải là 10-11 số'),
  check('email').isEmail().withMessage('Email không hợp lệ'),
  validate,

  async (req, res, next) => {
    try {
      const licenseFile = req.files?.license?.[0] || null;
      const descFile    = req.files?.description?.[0] || null;
      const logoFile    = req.files?.logo?.[0] || null;

      // With Cloudinary, files already have full URLs
      const license_url     = licenseFile ? licenseFile.url : null;
      const description_url = descFile    ? descFile.url    : null;
      const logo_url        = logoFile    ? logoFile.url    : null;

      const payload = {
        ...req.body,
        license_url,
        description_url,
        logo_url,
      };

      const charity = await charityService.registerCharity(req.user.user_id, payload);

      res.status(201).json({
        message: 'Đăng ký tổ chức từ thiện thành công, đang chờ xác minh',
        charity,
        license_url,
        description_url,
        logo_url,
      });
    } catch (error) {
      next(error);
    }
  },
];

/* ======================= MY CHARITY ======================= */

exports.getMyCharity = [
  requireCharity,
  async (req, res, next) => {
    try {
      const charity = await charityService.getMyCharity(req.user.user_id);
      res.json(charity);
    } catch (error) {
      next(error);
    }
  },
];

exports.updateMyCharity = [
  requireCharityOwnership,
  check('name').optional().isLength({ min: 2, max: 200 }).withMessage('Tên tổ chức phải từ 2-200 ký tự'),
  check('email').optional().isEmail().withMessage('Email không hợp lệ'),
  check('phone').optional().matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phải là 10-11 số'),
  check('website_url').optional().isURL().withMessage('Website URL không hợp lệ'),
  validate,
  async (req, res, next) => {
    try {
      const charity = await charityService.updateMyCharity(req.user.user_id, req.body);
      res.json({
        message: 'Cập nhật thông tin tổ chức thành công',
        charity,
      });
    } catch (error) {
      next(error);
    }
  },
];

exports.getCharityStats = [
  requireCharityOwnership,
  async (req, res, next) => {
    try {
      const stats = await charityService.getCharityStats(req.user.user_id);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },
];

/* ======================= CAMPAIGN MANAGEMENT ======================= */

exports.createCampaign = [
  requireCharityOwnership,
  uploadQrImage,
  handleMulterError,
  check('title').isLength({ min: 5, max: 200 }).withMessage('Tiêu đề phải từ 5-200 ký tự'),
  check('description').notEmpty().withMessage('Mô tả không được để trống'),
  check('goal_amount').isFloat({ min: 100000 }).withMessage('Số tiền mục tiêu tối thiểu 100,000 VND'),
  check('start_date').isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  check('end_date').isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  check('category').notEmpty().withMessage('Danh mục không được để trống'),
  validate,
  async (req, res, next) => {
    try {
      const campaign = await campaignService.createCampaign(
        req.user.user_id,
        req.body,
        req.file // qr_image
      );
      res.status(201).json({ message: 'Tạo chiến dịch thành công, đang chờ duyệt', campaign });
    } catch (error) {
      next(error);
    }
  },
];

exports.getMyCampaigns = [
  requireCharityOwnership,
  async (req, res, next) => {
    try {
      const campaigns = await campaignService.getMyCampaigns(req.user.user_id, req.query);
      res.json(campaigns);
    } catch (error) {
      next(error);
    }
  },
];

exports.getMyCampaignById = [
  requireCharityOwnership,
  async (req, res, next) => {
    try {
      const campaign = await campaignService.getMyCampaignById(req.user.user_id, req.params.id);
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  },
];

// ========= CẬP NHẬT CAMPAIGN (multipart/form-data) =========
exports.updateMyCampaign = [
  requireCharityOwnership,
  uploadCampaignUpdate.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
    { name: 'qr_image', maxCount: 1 },
  ]),
  check('title').optional().isLength({ min: 5, max: 200 }).withMessage('Tiêu đề phải từ 5-200 ký tự'),
  check('goal_amount').optional().isFloat({ min: 100000 }).withMessage('Số tiền mục tiêu tối thiểu 100,000 VND'),
  validate,
  async (req, res, next) => {
    try {
      const b = req.body || {};
      const files = req.files || {};

      const keep = []
        .concat(b.keep_image_urls || [])
        .flat()
        .filter(Boolean);

      const cover = files.image?.[0];
      const galleryFiles = files.images || [];
      const qr = files.qr_image?.[0];

      const update = {
        title: b.title,
        description: b.description,
        detailed_description: b.detailed_description,
        category: b.category,
        location: b.location,
      };

      if (b.goal_amount) update.goal_amount = Number(b.goal_amount);
      if (b.start_date) update.start_date = b.start_date;
      if (b.end_date) update.end_date = b.end_date;

      if (cover) update.image_url = cover.url; // Cloudinary URL

      if (keep.length || galleryFiles.length) {
        update._keep_gallery = keep;
        update._new_gallery = galleryFiles.map(f => f.url); // Cloudinary URLs
      }

      if (qr) {
        update.qr_code_url = qr.url; // Cloudinary URL
      } else if (b.qr_code_url) {
        update.qr_code_url = b.qr_code_url;
      }

      const campaign = await campaignService.updateMyCampaign(
        req.user.user_id,
        req.params.id,
        update
      );

      res.json({ message: 'Cập nhật chiến dịch thành công', campaign });
    } catch (error) {
      next(error);
    }
  },
];

exports.deleteMyCampaign = [
  requireCharityOwnership,
  async (req, res, next) => {
    try {
      const result = await campaignService.deleteMyCampaign(req.user.user_id, req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
];

exports.addProgressUpdate = [
  requireCharityOwnership,
  check('title').notEmpty().withMessage('Tiêu đề cập nhật không được để trống'),
  check('content').notEmpty().withMessage('Nội dung cập nhật không được để trống'),
  validate,
  async (req, res, next) => {
    try {
      const campaign = await campaignService.addProgressUpdate(req.user.user_id, req.params.id, req.body);
      res.json({
        message: 'Thêm cập nhật tiến độ thành công',
        campaign,
      });
    } catch (error) {
      next(error);
    }
  },
];

exports.getCampaignStats = [
  requireCharityOwnership,
  async (req, res, next) => {
    try {
      const stats = await campaignService.getCampaignStats(req.user.user_id, req.params.id);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },
];

/* ======================= APPROVE / REJECT CHARITY ======================= */
/**
 * PUT /api/charities/:id/status
 * Body: { "status": "approved" | "verified" | "rejected", "rejection_reason"?: string }
 */
exports.updateCharityStatus = async (req, res, next) => {
  const { id } = req.params; // charity_id
  const { status, rejection_reason } = req.body;

  const normalized =
    status === 'approved' ? 'verified'
    : status === 'verified' ? 'verified'
    : status === 'rejected' ? 'rejected'
    : null;

  if (!normalized) {
    return res.status(400).json({ status: 'fail', message: 'Trạng thái không hợp lệ' });
  }

  const t = await sequelize.transaction();
  try {
    logger.info(`[APPROVE] Start update charity status: charity_id=${id}, to=${normalized}`);

    // 1) Lấy charity + user (lock trong transaction)
    const charity = await Charity.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!charity) {
      await t.rollback();
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy tổ chức' });
    }
    const user = await User.findByPk(charity.user_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy user của tổ chức' });
    }

    // 2) Cập nhật trạng thái tổ chức + role user
    if (normalized === 'verified') {
      await charity.update(
        {
          verification_status: 'verified',
          verified_at: new Date(),
          verified_by: req.user?.user_id || 'admin',
          rejection_reason: null,
        },
        { transaction: t }
      );

      if (user.role !== 'charity') {
        await user.update({ role: 'charity' }, { transaction: t });
      }
    } else {
      await charity.update(
        {
          verification_status: 'rejected',
          verified_at: null,
          verified_by: req.user?.user_id || 'admin',
          rejection_reason: rejection_reason || null,
        },
        { transaction: t }
      );
    }

    // 3) Tạo notification TRONG transaction (atomic)
    const notiPayload =
      normalized === 'verified'
        ? {
            user_id: String(user.user_id),
            title: 'Đơn đăng ký hội viên được duyệt',
            content: 'Chúc mừng! Đơn đăng ký trở thành tổ chức từ thiện của bạn đã được duyệt.',
            type: 'system',
            is_read: false,
            created_at: new Date(),
          }
        : {
            user_id: String(user.user_id),
            title: 'Đơn đăng ký bị từ chối',
            content: `Rất tiếc, đơn đăng ký đã bị từ chối.${rejection_reason ? ` Lý do: ${rejection_reason}.` : ''}`,
            type: 'system',
            is_read: false,
            created_at: new Date(),
          };

    logger.info(`[APPROVE] Will create notification for user_id=${user.user_id}, status=${normalized}`);
    const createdNoti = await Notification.create(notiPayload, { transaction: t });
    logger.info(`[APPROVE] Notification created in TX: ${createdNoti?.noti_id}`);

    // 4) Commit
    await t.commit();
    logger.info(`[APPROVE] Charity updated & notification committed. user_id=${user.user_id}`);

    return res.json({
      status: 'success',
      message: `Đã cập nhật trạng thái: ${normalized}`,
      notification_id: createdNoti?.noti_id,
    });
  } catch (err) {
    try { await t.rollback(); } catch {}
    logger.error('Lỗi duyệt charity:', err);
    return next(err);
  }
};

/* ======================= FINANCIAL REPORTS ======================= */

exports.createFinancialReport = [
  requireCharityOwnership,
  check('report_type')
    .isIn(['monthly', 'quarterly', 'yearly', 'campaign', 'custom'])
    .withMessage('Loại báo cáo không hợp lệ'),
  check('period_start').isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  check('period_end').isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  validate,
  async (req, res, next) => {
    try {
      const report = await financialReportService.createFinancialReport(req.user.user_id, req.body);
      res.status(201).json({
        message: 'Tạo báo cáo tài chính thành công',
        report,
      });
    } catch (error) {
      next(error);
    }
  },
];

exports.getMyFinancialReports = [
  requireCharityOwnership,
  async (req, res, next) => {
    try {
      const reports = await financialReportService.getMyFinancialReports(req.user.user_id, req.query);
      res.json(reports);
    } catch (error) {
      next(error);
    }
  },
];

exports.getMyFinancialReportById = [
  requireCharityOwnership,
  async (req, res, next) => {
    try {
      const report = await financialReportService.getMyFinancialReportById(req.user.user_id, req.params.id);
      res.json(report);
    } catch (error) {
      next(error);
    }
  },
];

exports.updateMyFinancialReport = [
  requireCharityOwnership,
  async (req, res, next) => {
    try {
      const report = await financialReportService.updateMyFinancialReport(
        req.user.user_id,
        req.params.id,
        req.body
      );
      res.json({
        message: 'Cập nhật báo cáo tài chính thành công',
        report,
      });
    } catch (error) {
      next(error);
    }
  },
];

exports.deleteMyFinancialReport = [
  requireCharityOwnership,
  async (req, res, next) => {
    try {
      const result = await financialReportService.deleteMyFinancialReport(req.user.user_id, req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
];

exports.generateAutoReport = [
  requireCharityOwnership,
  check('report_type').isIn(['monthly', 'quarterly', 'yearly', 'campaign']).withMessage('Loại báo cáo không hợp lệ'),
  check('period_start').isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  check('period_end').isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  validate,
  async (req, res, next) => {
    try {
      const { report_type, period_start, period_end, campaign_id } = req.body;
      const report = await financialReportService.generateAutoReport(
        req.user.user_id,
        report_type,
        period_start,
        period_end,
        campaign_id
      );
      res.status(201).json({
        message: 'Tạo báo cáo tự động thành công',
        report,
      });
    } catch (error) {
      next(error);
    }
  },
];

exports.submitFinancialReport = [
  requireCharityOwnership,
  async (req, res, next) => {
    try {
      const report = await financialReportService.submitFinancialReport(req.user.user_id, req.params.id);
      res.json({
        message: 'Submit báo cáo tài chính thành công',
        report,
      });
    } catch (error) {
      next(error);
    }
  },
];

exports.getFinancialOverview = [
  requireCharityOwnership,
  async (req, res, next) => {
    try {
      const { year } = req.query;
      const overview = await financialReportService.getFinancialOverview(req.user.user_id, year);
      res.json(overview);
    } catch (error) {
      next(error);
    }
  },
];

/* ======================= PUBLIC ENDPOINTS ======================= */

exports.getAllCharities = async (req, res, next) => {
  try {
    const charities = await charityService.getAllCharities(req.query);
    res.json(charities);
  } catch (error) {
    next(error);
  }
};

exports.getCharityById = async (req, res, next) => {
  try {
    const charity = await charityService.getCharityById(req.params.id);
    res.json(charity);
  } catch (error) {
    next(error);
  }
};

/* ======================= DOCUMENT UPLOAD ======================= */

exports.uploadDocument = [
  requireCharityOwnership,
  uploadDocument,
  handleMulterError,
  async (req, res, next) => {
    try {
      const result = await charityService.uploadDocument(req.user.user_id, req.file, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
];
