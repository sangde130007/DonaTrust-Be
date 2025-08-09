// controllers/campaignController.js
const { check } = require('express-validator');
const campaignService = require('../services/campaignService');
const validate = require('../middleware/validationMiddleware');

// ================== PUBLIC ==================

/**
 * GET /api/campaigns
 */
exports.getAllCampaigns = async (req, res, next) => {
  try {
    const campaigns = await campaignService.getAllCampaigns(req.query);
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/campaigns/:id
 */
exports.getCampaignById = async (req, res, next) => {
  try {
    const campaign = await campaignService.getCampaignById(req.params.id);
    res.json(campaign);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/campaigns/featured
 */
exports.getFeaturedCampaigns = async (req, res, next) => {
  try {
    const { limit = 6 } = req.query;
    const campaigns = await campaignService.getAllCampaigns({
      featured: true,
      limit,
      page: 1,
      sort: 'created_at',
      order: 'DESC',
    });
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/campaigns/categories
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = [
      { id: 'education',  name: 'Giáo dục',              icon: '🎓' },
      { id: 'health',     name: 'Y tế',                  icon: '🏥' },
      { id: 'environment',name: 'Môi trường',            icon: '🌱' },
      { id: 'poverty',    name: 'Xóa đói giảm nghèo',    icon: '🍚' },
      { id: 'disaster',   name: 'Cứu trợ thiên tai',     icon: '🆘' },
      { id: 'children',   name: 'Trẻ em',                icon: '👶' },
      { id: 'elderly',    name: 'Người cao tuổi',        icon: '👴' },
      { id: 'disability', name: 'Người khuyết tật',      icon: '♿' },
      { id: 'animals',    name: 'Bảo vệ động vật',       icon: '🐕' },
      { id: 'community',  name: 'Cộng đồng',             icon: '🏘️' },
    ];
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// ================== CREATE / UPDATE / DELETE ==================

/**
 * POST /api/campaigns
 * Yêu cầu: authMiddleware + requireCharity + upload.fields([{ image, images, qr_image }])
 * FE KHÔNG gửi charity_id; lấy từ req.user (JWT)
 */
exports.create = [
  check('title').notEmpty().withMessage('Tiêu đề là bắt buộc'),
  check('goal_amount').isFloat({ min: 0 }).withMessage('Số tiền mục tiêu không hợp lệ'),
  validate,
  async (req, res, next) => {
    try {
      // 1) Lấy charity_id từ token
      const charity_id =
        req.user?.charity_id ||
        req.user?.charity?.charity_id ||
        null;

      if (!charity_id) {
        return res.status(403).json({
          status: 'error',
          message: 'Tài khoản không có quyền charity hoặc thiếu charity_id trong token',
        });
      }

      // 2) Chuẩn hoá file -> URL public (/uploads/campaigns/<filename>)
      const fileToUrl = (f) => (f ? `/uploads/campaigns/${f.filename}` : null);

      const image_url      = fileToUrl(req.files?.image?.[0]);                       // ảnh đại diện
      const gallery_images = (req.files?.images || []).map(fileToUrl).filter(Boolean); // mảng URL
      const qr_code_url    = fileToUrl(req.files?.qr_image?.[0]);                    // QR

      // 3) Payload tạo campaign
      const payload = {
        ...req.body,
        charity_id,
        image_url,
        gallery_images,
        qr_code_url,
      };

      // 4) Tạo campaign
      const campaign = await campaignService.create(payload);
      res.status(201).json(campaign);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * PUT /api/campaigns/:id
 */
exports.update = [
  check('title').optional().notEmpty().withMessage('Tiêu đề không được để trống'),
  validate,
  async (req, res, next) => {
    try {
      const campaign = await campaignService.update(req.params.id, req.body);
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * DELETE /api/campaigns/:id
 */
exports.delete = async (req, res, next) => {
  try {
    await campaignService.delete(req.params.id);
    res.json({ message: 'Đã xóa chiến dịch' });
  } catch (error) {
    next(error);
  }
};

// ================== UPLOAD RIÊNG (tuỳ chọn dùng) ==================

/**
 * POST /api/campaigns/:id/upload-image  (field: image)
 */
exports.uploadImage = async (req, res, next) => {
  try {
    const result = await campaignService.uploadImage(
      req.params.id,
      req.file,
      req.user.user_id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/campaigns/:id/upload-images (field: images[])
 */
exports.uploadImages = async (req, res, next) => {
  try {
    const result = await campaignService.uploadImages(
      req.params.id,
      req.files,
      req.user.user_id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};
	