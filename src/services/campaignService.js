// src/services/campaignService.js
const Campaign = require('../models/Campaign');
const Charity = require('../models/Charity');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Tạo campaign mới theo dạng payload (khớp controller hiện tại)
 * payload mong đợi: {
 *   charity_id, title, description, detailed_description, goal_amount,
 *   start_date, end_date, category, location,
 *   image_url, gallery_images (array), qr_code_url
 * }
 */
async function create(payload) {
  const {
    charity_id,
    title,
    description,
    detailed_description,
    goal_amount,
    start_date,
    end_date,
    category,
    location,
    image_url,
    gallery_images,
    qr_code_url,
  } = payload;

  if (!charity_id) throw new AppError('Thiếu charity_id', 400);

  // Validate ngày
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const today = new Date();
  if (isNaN(startDate) || isNaN(endDate)) {
    throw new AppError('Ngày bắt đầu/kết thúc không hợp lệ', 400);
  }
  if (startDate < today) throw new AppError('Ngày bắt đầu không thể là quá khứ', 400);
  if (endDate <= startDate) throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', 400);

  // Đảm bảo charity tồn tại & (tuỳ chính sách) đã xác minh
  const charity = await Charity.findOne({ where: { charity_id } });
  if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
  if (charity.verification_status && charity.verification_status !== 'verified') {
    throw new AppError('Tổ chức từ thiện chưa được xác minh', 403);
  }

  const campaign = await Campaign.create({
    charity_id,
    title,
    description,
    detailed_description: detailed_description || null,
    goal_amount: Number(goal_amount),
    start_date,
    end_date,
    category,
    location: location || null,
    image_url: image_url || null,
    gallery_images: Array.isArray(gallery_images) ? gallery_images : [],
    qr_code_url: qr_code_url || null,
    status: 'pending',          // chỉnh theo rule của bạn
    approval_status: 'pending', // chỉnh theo rule của bạn
  });

  // (tuỳ chọn) cập nhật đếm
  if (typeof charity.active_campaigns === 'number') {
    await charity.update({ active_campaigns: charity.active_campaigns + 1 });
  }

  return campaign;
}

/**
 * (Giữ hàm cũ) Tạo campaign theo userId + data + file QR
 * Dùng ở nơi khác trong app nếu còn
 */
exports.createCampaign = async (userId, campaignData, file) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
  if (charity.verification_status !== 'verified') {
    throw new AppError('Tổ chức từ thiện chưa được xác minh', 403);
  }

  const startDate = new Date(campaignData.start_date);
  const endDate   = new Date(campaignData.end_date);
  const today     = new Date();
  if (startDate < today) throw new AppError('Ngày bắt đầu không thể là quá khứ', 400);
  if (endDate <= startDate) throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', 400);

  // Dùng tham số file (QR) nếu có
  const qr_code_url = file
    ? `/uploads/campaigns/${file.filename}`
    : (campaignData.qr_code_url?.trim() || null);

  const campaign = await Campaign.create({
    title: campaignData.title,
    description: campaignData.description,
    detailed_description: campaignData.detailed_description || null,
    goal_amount: Number(campaignData.goal_amount),
    start_date: campaignData.start_date,
    end_date: campaignData.end_date,
    category: campaignData.category,
    qr_code_url,
    charity_id: charity.charity_id,
    status: 'pending',
    approval_status: 'pending',
  });

  await charity.update({
    active_campaigns: charity.active_campaigns + 1,
  });

  return campaign;
};

/**
 * Lấy tất cả campaigns của charity (dashboard)
 */
exports.getMyCampaigns = async (userId, filters = {}) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const { page = 1, limit = 10, status, search, sort = 'created_at', order = 'DESC' } = filters;

  const offset = (page - 1) * limit;
  const whereClause = { charity_id: charity.charity_id };

  if (status) whereClause.status = status;
  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const campaigns = await Campaign.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Charity,
        as: 'charity',
        attributes: ['name', 'logo_url'],
      },
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sort, order.toUpperCase()]],
  });

  return {
    campaigns: campaigns.rows,
    total: campaigns.count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(campaigns.count / limit),
  };
};

/**
 * Lấy campaign theo ID (của charity)
 */
exports.getMyCampaignById = async (userId, campaignId) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const campaign = await Campaign.findOne({
    where: { campaign_id: campaignId, charity_id: charity.charity_id },
    include: [
      {
        model: Charity,
        as: 'charity',
        attributes: ['name', 'logo_url', 'verification_status'],
      },
    ],
  });

  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);
  return campaign;
};

/**
 * Cập nhật campaign (của charity)
 */
exports.updateMyCampaign = async (userId, campaignId, updateData) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const campaign = await Campaign.findOne({
    where: { campaign_id: campaignId, charity_id: charity.charity_id },
  });
  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);

  if (['active', 'completed'].includes(campaign.status)) {
    throw new AppError('Không thể sửa chiến dịch đang hoạt động hoặc đã hoàn thành', 400);
  }

  if (updateData.start_date || updateData.end_date) {
    const startDate = new Date(updateData.start_date || campaign.start_date);
    const endDate = new Date(updateData.end_date || campaign.end_date);
    const today = new Date();
    if (updateData.start_date && startDate < today) {
      throw new AppError('Ngày bắt đầu không thể là quá khứ', 400);
    }
    if (endDate <= startDate) {
      throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', 400);
    }
  }

  await campaign.update(updateData);
  logger.info(`Campaign updated: ${campaign.title} by charity ${charity.name}`);
  return campaign;
};

/**
 * Xoá campaign (của charity)
 */
exports.deleteMyCampaign = async (userId, campaignId) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const campaign = await Campaign.findOne({
    where: { campaign_id: campaignId, charity_id: charity.charity_id },
  });
  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);

  const donationCount = await Donation.count({ where: { campaign_id: campaignId } });
  if (donationCount > 0) {
    throw new AppError('Không thể xóa chiến dịch đã có người quyên góp', 400);
  }

  await campaign.destroy();

  if (typeof charity.active_campaigns === 'number') {
    await charity.update({ active_campaigns: Math.max(0, charity.active_campaigns - 1) });
  }

  logger.info(`Campaign deleted: ${campaign.title} by charity ${charity.name}`);
  return { message: 'Đã xóa chiến dịch thành công' };
};

/**
 * Thêm progress update (của charity)
 */
exports.addProgressUpdate = async (userId, campaignId, updateData) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const campaign = await Campaign.findOne({
    where: { campaign_id: campaignId, charity_id: charity.charity_id },
  });
  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);

  const newUpdate = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    title: updateData.title,
    content: updateData.content,
    images: updateData.images || [],
  };

  const currentUpdates = campaign.progress_updates || [];
  const updatedUpdates = [newUpdate, ...currentUpdates];

  await campaign.update({ progress_updates: updatedUpdates });

  logger.info(`Progress update added to campaign: ${campaign.title}`);
  return campaign;
};

/**
 * Lấy thống kê campaign (của charity)
 */
exports.getCampaignStats = async (userId, campaignId) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const campaign = await Campaign.findOne({
    where: { campaign_id: campaignId, charity_id: charity.charity_id },
  });
  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);

  const donations = await Donation.findAll({
    where: { campaign_id: campaignId },
    include: [{ model: User, attributes: ['full_name'] }],
    order: [['created_at', 'DESC']],
  });

  const total_amount = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const stats = {
    total_donations: donations.length,
    total_amount,
    average_donation: donations.length > 0 ? total_amount / donations.length : 0,
    goal_percentage: ((parseFloat(campaign.current_amount) / parseFloat(campaign.goal_amount)) * 100).toFixed(2),
    recent_donations: donations.slice(0, 10),
    days_remaining: Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24))),
  };

  return stats;
};

/**
 * Lấy tất cả campaigns (public)
 */
exports.getAllCampaigns = async (filters = {}) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    status = 'active',
    charity_id,
    featured,
    sort = 'created_at',
    order = 'DESC',
  } = filters;

  const offset = (page - 1) * limit;
  const whereClause = { approval_status: 'approved' };

  if (status) whereClause.status = status;
  if (category) whereClause.category = category;
  if (charity_id) whereClause.charity_id = charity_id;

  if (featured !== undefined) {
    // Nếu FE gửi boolean/tham số string, chuyển giúp:
    if (typeof featured === 'string') {
      whereClause.featured = featured === 'true';
    } else {
      whereClause.featured = !!featured;
    }
  }

  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const campaigns = await Campaign.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Charity,
        as: 'charity',
        attributes: ['charity_id', 'name', 'logo_url', 'verification_status'],
        where: { verification_status: 'verified' },
      },
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sort, order.toUpperCase()]],
  });

  return {
    campaigns: campaigns.rows,
    total: campaigns.count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(campaigns.count / limit),
  };
};

/**
 * Lấy campaign theo ID (public)
 */
exports.getCampaignById = async (campaignId) => {
  const campaign = await Campaign.findOne({
    where: { campaign_id: campaignId, approval_status: 'approved' },
    include: [
      {
        model: Charity,
        as: 'charity',
        attributes: ['charity_id', 'name', 'logo_url', 'verification_status', 'rating'],
        where: { verification_status: 'verified' },
      },
    ],
  });

  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);

  await campaign.update({ views: campaign.views + 1 });
  return campaign;
};

/**
 * Upload ảnh đơn cho campaign
 */
exports.uploadImage = async (campaignId, file, userId) => {
  if (!file) throw new AppError('Không có file được upload', 400);

  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const campaign = await Campaign.findOne({
    where: { campaign_id: campaignId, charity_id: charity.charity_id },
  });
  if (!campaign) throw new AppError('Không tìm thấy chiến dịch hoặc bạn không có quyền', 404);

  const imageUrl = `/uploads/campaigns/${file.filename}`;
  await campaign.update({ image_url: imageUrl });

  logger.info(`Campaign image uploaded: ${campaign.title}, file: ${file.filename}`);
  return {
    message: 'Upload ảnh chiến dịch thành công',
    image_url: imageUrl,
    campaign,
  };
};

/**
 * Upload nhiều ảnh cho campaign (gallery)
 * — dùng đúng cột gallery_images (JSON/JSONB)
 */
exports.uploadImages = async (campaignId, files, userId) => {
  // files có thể là array (upload.any/array) hoặc object (fields)
  const list = Array.isArray(files) ? files : (files?.images || []);
  if (!list || list.length === 0) throw new AppError('Không có file được upload', 400);

  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const campaign = await Campaign.findOne({
    where: { campaign_id: campaignId, charity_id: charity.charity_id },
  });
  if (!campaign) throw new AppError('Không tìm thấy chiến dịch hoặc bạn không có quyền', 404);

  const uploadedImages = list.map((f) => `/uploads/campaigns/${f.filename}`);
  const currentGallery = Array.isArray(campaign.gallery_images) ? campaign.gallery_images : [];
  const updatedGallery = [...currentGallery, ...uploadedImages];

  await campaign.update({ gallery_images: updatedGallery });

  logger.info(`Campaign images uploaded: ${campaign.title}, files: ${uploadedImages.join(', ')}`);
  return {
    message: `Upload ${uploadedImages.length} ảnh chiến dịch thành công`,
    uploaded_images: uploadedImages,
    campaign,
  };
};

/**
 * Export thêm hàm create để controller dùng
 */
exports.create = create;
