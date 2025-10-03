  // controllers/campaignController.js
  const { check } = require('express-validator');
  const campaignService = require('../services/campaignService');
  const validate = require('../middleware/validationMiddleware');
  const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');


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
    // ====== Updates (Hoạt động) ======
  const Campaign = require('../models/Campaign');
  const crypto = require('crypto');

  // GET /api/campaigns/:id/updates?page=&limit=
  exports.getCampaignUpdates = async (req, res, next) => {
    try {
      const { id } = req.params;
      const page  = Math.max(parseInt(req.query.page  || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || '5', 10), 1), 50);

      const campaign = await Campaign.findOne({ where: { campaign_id: id } });
      if (!campaign) return res.status(404).json({ message: 'Không tìm thấy chiến dịch' });

      const list = Array.isArray(campaign.progress_updates) ? campaign.progress_updates : [];
      // sort desc theo created_at
      const sorted = [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      const total = sorted.length;
      const totalPages = Math.max(Math.ceil(total / limit), 1);
      const offset = (page - 1) * limit;
      const items = sorted.slice(offset, offset + limit);

      return res.json({ page, limit, total, totalPages, updates: items });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/campaigns/:id/updates  (multipart images[])
  exports.createCampaignUpdate = async (req, res, next) => {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findOne({ where: { campaign_id: id } });
      if (!campaign) return res.status(404).json({ message: 'Không tìm thấy chiến dịch' });

      const { title, content, spent_amount } = req.body;
      if (!title && !content) {
        return res.status(400).json({ message: 'Cần ít nhất tiêu đề hoặc nội dung.' });
      }

      // spent_items: JSON string -> array [{label, amount}]
      let spent_items = null;
      if (req.body.spent_items) {
        try {
          const parsed = JSON.parse(req.body.spent_items);
          if (Array.isArray(parsed)) {
            const cleaned = parsed
              .filter((it) => (it.label?.trim() || '') !== '' || !isNaN(Number(it.amount)))
              .map((it) => ({ label: String(it.label || '').trim(), amount: Number(it.amount || 0) }));
            if (cleaned.length) spent_items = cleaned;
          }
        } catch {
          return res.status(400).json({ message: 'spent_items không phải JSON hợp lệ' });
        }
      }

       const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // Upload từ buffer lên Cloudinary
          const cloudinaryUrl = await uploadToCloudinary(
            file.buffer,
            `campaigns/${id}/updates` // Folder trên Cloudinary
          );
          images.push(cloudinaryUrl);
        } catch (uploadErr) {
          console.error('Lỗi upload ảnh lên Cloudinary:', uploadErr);
          // Có thể skip hoặc throw error tùy yêu cầu
          // Ở đây mình skip ảnh lỗi, tiếp tục upload ảnh khác
        }
      }
    }
      const authorId = String(req.user?.user_id || req.user?.id || '');
      const now = new Date().toISOString();

      const newUpdate = {
        id: crypto.randomUUID(),
        created_at: now,
        created_by: authorId,
        title: title || null,
        content: content || '',
        spent_amount:
          spent_amount != null && String(spent_amount).trim() !== ''
            ? Number(spent_amount)
            : null,
        spent_items, // có thể null
        images,      // []
      };

   // controllers/campaignController.js -> createCampaignUpdate

const arr = Array.isArray(campaign.progress_updates) ? campaign.progress_updates : [];
arr.push(newUpdate);

await Campaign.update(
  { progress_updates: arr, updated_at: new Date() },
  { where: { campaign_id: id } }
);

// (tuỳ chọn) lấy lại dữ liệu mới để trả ra
const saved = await Campaign.findOne({ where: { campaign_id: id } });

return res.status(201).json({
  message: 'Tạo cập nhật thành công',
  update: newUpdate,
  total_updates: saved?.progress_updates?.length || arr.length
});

    } catch (err) {
      next(err);
    }
  };
// DELETE /api/campaigns/:id/updates/:updateId
exports.deleteCampaignUpdate = async (req, res, next) => {
  try {
    const { id, updateId } = req.params;

    const campaign = await Campaign.findOne({ where: { campaign_id: id } });
    if (!campaign) return res.status(404).json({ message: 'Không tìm thấy chiến dịch' });

    const list = Array.isArray(campaign.progress_updates) ? campaign.progress_updates : [];
    const upd = list.find(u => String(u.id) === String(updateId));
    if (!upd) return res.status(404).json({ message: 'Không tìm thấy cập nhật cần xoá' });

    // (tuỳ chọn) Chỉ admin hoặc chính người tạo update được xoá:
    const me = String(req.user?.user_id || req.user?.id || '');
    if (req.user.role !== 'admin' && String(upd.created_by || '') !== me) {
      return res.status(403).json({ message: 'Bạn không thể xoá cập nhật của người khác' });
    }
    if (upd.images && Array.isArray(upd.images) && upd.images.length > 0) {
      for (const imageUrl of upd.images) {
        try {
          await deleteFromCloudinary(imageUrl);
        } catch (delErr) {
          console.error('Lỗi xóa ảnh Cloudinary:', delErr);
          // Không throw error, tiếp tục xóa record
        }
      }
    }

    campaign.progress_updates = list.filter(u => String(u.id) !== String(updateId));
    await campaign.save();

    return res.json({ message: 'Đã xoá cập nhật thành công', updateId });
  } catch (err) {
    next(err);
  }
};
