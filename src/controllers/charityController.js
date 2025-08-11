// src/controllers/charityController.js
const { check } = require('express-validator');
const path = require('path');
const multer = require('multer');

const charityService = require('../services/charityService');
const campaignService = require('../services/campaignService');
const financialReportService = require('../services/financialReportService');
const validate = require('../middleware/validationMiddleware');
const { requireCharityOwnership, requireCharity } = require('../middleware/roleMiddleware');
const { uploadQrImage, uploadDocument, handleMulterError } = require('../middleware/uploadMiddleware');

// ===== Multer cho cập nhật campaign (cover, gallery, qr) =====
const uploadCampaignUpdate = multer({
  dest: path.join(process.cwd(), 'uploads', 'campaigns'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

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

exports.getAll = async (req, res, next) => {
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

/**
 * @swagger
 * tags:
 *   name: Charity Management
 *   description: API quản lý tổ chức từ thiện
 */

exports.registerCharity = [
  check('name').isLength({ min: 2, max: 200 }).withMessage('Tên tổ chức phải từ 2-200 ký tự'),
  check('description').notEmpty().withMessage('Mô tả không được để trống'),
  check('mission').notEmpty().withMessage('Sứ mệnh không được để trống'),
  check('license_number').notEmpty().withMessage('Số giấy phép không được để trống'),
  check('license_document').isURL().withMessage('Link giấy phép không hợp lệ'),
  check('address').notEmpty().withMessage('Địa chỉ không được để trống'),
  check('city').notEmpty().withMessage('Thành phố không được để trống'),
  check('phone')
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải là 10-11 số'),
  check('email').isEmail().withMessage('Email không hợp lệ'),
  validate,
  async (req, res, next) => {
    try {
      const charity = await charityService.registerCharity(req.user.user_id, req.body);
      res.status(201).json({
        message: 'Đăng ký tổ chức từ thiện thành công, đang chờ xác minh',
        charity,
      });
    } catch (error) {
      next(error);
    }
  },
];

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
  check('phone')
    .optional()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải là 10-11 số'),
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

// ============== CAMPAIGN MANAGEMENT ==============

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

// ========= CẬP NHẬT CAMPAIGN (Fix: nhận multipart/form-data) =========
exports.updateMyCampaign = [
  requireCharityOwnership,
  uploadCampaignUpdate.fields([
    { name: 'image', maxCount: 1 },     // ảnh cover
    { name: 'images', maxCount: 10 },   // gallery
    { name: 'qr_image', maxCount: 1 },  // QR ảnh
  ]),
  // handleMulterError, // bật nếu muốn bắt lỗi sớm
  check('title').optional().isLength({ min: 5, max: 200 }).withMessage('Tiêu đề phải từ 5-200 ký tự'),
  check('goal_amount').optional().isFloat({ min: 100000 }).withMessage('Số tiền mục tiêu tối thiểu 100,000 VND'),
  validate,
  async (req, res, next) => {
    try {
      const b = req.body || {};
      const files = req.files || {};

      // keep_image_urls có thể gửi nhiều dòng → luôn về array
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

      if (cover) {
        update.image_url = `/uploads/campaigns/${cover.filename}`;
      }

      if (keep.length || galleryFiles.length) {
        update._keep_gallery = keep;
        update._new_gallery = galleryFiles.map(f => `/uploads/campaigns/${f.filename}`);
      }

      if (qr) {
        update.qr_code_url = `/uploads/campaigns/${qr.filename}`;
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

// ============== FINANCIAL REPORTS ==============

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

// ============== PUBLIC ENDPOINTS ==============

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

// ============== DOCUMENT UPLOAD ==============

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
