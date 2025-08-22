const Campaign = require('../models/Campaign');
const Charity = require('../models/Charity');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Tạo campaign mới (charity only)
 */
exports.createCampaign = async (userId, campaignData) => {
  // Lấy charity của user
  const charity = await Charity.findOne({ where: { user_id: userId } });

  if (!charity) {
    throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
  }

  if (charity.verification_status !== 'verified') {
    throw new AppError('Tổ chức từ thiện chưa được xác minh', 403);
  }

  // Validate dates
  const startDate = new Date(campaignData.start_date);
  const endDate = new Date(campaignData.end_date);
  const today = new Date();

  if (startDate < today) {
    throw new AppError('Ngày bắt đầu không thể là quá khứ', 400);
  }

  if (endDate <= startDate) {
    throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', 400);
  }

  // ✅ SỬA: Campaign mới sẽ đi qua DAO vote trước
  const campaign = await Campaign.create({
    ...campaignData,
    charity_id: charity.charity_id,
    status: 'pending', // Campaign status
    approval_status: 'pending', // Chờ DAO vote + admin approve
    dao_approval_status: null, // Chưa có DAO vote nào
  });

  // Cập nhật số lượng campaign của charity
  await charity.update({
    active_campaigns: charity.active_campaigns + 1,
  });

  logger.info(`Campaign created for DAO voting: ${campaign.title} by charity ${charity.name}`);
  return campaign;
};

/**
 * Lấy tất cả campaigns của charity
 */
exports.getMyCampaigns = async (userId, filters = {}) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });

  if (!charity) {
    throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
  }

  const { page = 1, limit = 10, status, search, sort = 'created_at', order = 'DESC' } = filters;

  const offset = (page - 1) * limit;
  const whereClause = { charity_id: charity.charity_id };

  if (status) {
    whereClause.status = status;
  }

  if (search) {
    whereClause[Op.or] = [{ title: { [Op.iLike]: `%${search}%` } }, { description: { [Op.iLike]: `%${search}%` } }];
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

  if (!charity) {
    throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
  }

  const campaign = await Campaign.findOne({
    where: {
      campaign_id: campaignId,
      charity_id: charity.charity_id,
    },
    include: [
      {
        model: Charity,
        as: 'charity',
        attributes: ['name', 'logo_url', 'verification_status'],
      },
    ],
  });

  if (!campaign) {
    throw new AppError('Không tìm thấy chiến dịch', 404);
  }

  return campaign;
};

/**
 * Cập nhật campaign
 */
exports.updateMyCampaign = async (userId, campaignId, updateData) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });

  if (!charity) {
    throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
  }

  const campaign = await Campaign.findOne({
    where: {
      campaign_id: campaignId,
      charity_id: charity.charity_id,
    },
  });

  if (!campaign) {
    throw new AppError('Không tìm thấy chiến dịch', 404);
  }

  // Không cho phép sửa campaign đang active hoặc completed
  if (['active', 'completed'].includes(campaign.status)) {
    throw new AppError('Không thể sửa chiến dịch đang hoạt động hoặc đã hoàn thành', 400);
  }

  // Validate dates nếu có thay đổi
  if (updateData.start_date || updateData.end_date) {
    const startDate = new Date(updateData.start_date || campaign.start_date);
    const endDate = new Date(updateData.end_date || campaign.end_date);
    const today = new Date();

    if (startDate < today && updateData.start_date) {
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
 * Xóa campaign
 */
exports.deleteMyCampaign = async (userId, campaignId) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });

  if (!charity) {
    throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
  }

  const campaign = await Campaign.findOne({
    where: {
      campaign_id: campaignId,
      charity_id: charity.charity_id,
    },
  });

  if (!campaign) {
    throw new AppError('Không tìm thấy chiến dịch', 404);
  }

  // Kiểm tra có donation chưa
  const donationCount = await Donation.count({
    where: { campaign_id: campaignId },
  });

  if (donationCount > 0) {
    throw new AppError('Không thể xóa chiến dịch đã có người quyên góp', 400);
  }

  await campaign.destroy();

  // Cập nhật số lượng campaign của charity
  await charity.update({
    active_campaigns: Math.max(0, charity.active_campaigns - 1),
  });

  logger.info(`Campaign deleted: ${campaign.title} by charity ${charity.name}`);
  return { message: 'Đã xóa chiến dịch thành công' };
};

/**
 * Thêm progress update
 */
exports.addProgressUpdate = async (userId, campaignId, updateData) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });

  if (!charity) {
    throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
  }

  const campaign = await Campaign.findOne({
    where: {
      campaign_id: campaignId,
      charity_id: charity.charity_id,
    },
  });

  if (!campaign) {
    throw new AppError('Không tìm thấy chiến dịch', 404);
  }

  const newUpdate = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    title: updateData.title,
    content: updateData.content,
    images: updateData.images || [],
  };

  const currentUpdates = campaign.progress_updates || [];
  const updatedUpdates = [newUpdate, ...currentUpdates];

  await campaign.update({
    progress_updates: updatedUpdates,
  });

  logger.info(`Progress update added to campaign: ${campaign.title}`);
  return campaign;
};

/**
 * Lấy thống kê campaign
 */
exports.getCampaignStats = async (userId, campaignId) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });

  if (!charity) {
    throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
  }

  const campaign = await Campaign.findOne({
    where: {
      campaign_id: campaignId,
      charity_id: charity.charity_id,
    },
  });

  if (!campaign) {
    throw new AppError('Không tìm thấy chiến dịch', 404);
  }

  // Lấy thống kê donations
  const donations = await Donation.findAll({
    where: { campaign_id: campaignId },
    include: [
      {
        model: User,
        attributes: ['full_name'],
      },
    ],
    order: [['created_at', 'DESC']],
  });

  const stats = {
    total_donations: donations.length,
    total_amount: donations.reduce((sum, d) => sum + parseFloat(d.amount), 0),
    average_donation:
      donations.length > 0 ? donations.reduce((sum, d) => sum + parseFloat(d.amount), 0) / donations.length : 0,
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

  if (status) {
    whereClause.status = status;
  }

  if (category) {
    whereClause.category = category;
  }

  if (charity_id) {
    whereClause.charity_id = charity_id;
  }

  if (featured !== undefined) {
    whereClause.featured = featured === 'true';
  }

  if (search) {
    whereClause[Op.or] = [{ title: { [Op.iLike]: `%${search}%` } }, { description: { [Op.iLike]: `%${search}%` } }];
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
    where: {
      campaign_id: campaignId,
      approval_status: 'approved',
    },
    include: [
      {
        model: Charity,
        as: 'charity',
        attributes: ['charity_id', 'name', 'logo_url', 'verification_status', 'rating'],
        where: { verification_status: 'verified' },
      },
    ],
  });

  if (!campaign) {
    throw new AppError('Không tìm thấy chiến dịch', 404);
  }

  // Tăng view count
  await campaign.update({ views: campaign.views + 1 });

  return campaign;
};

/**
 * Upload ảnh đơn cho campaign
 */
exports.uploadImage = async (campaignId, file, userId) => {
  if (!file) {
    throw new AppError('Không có file được upload', 400);
  }

  // Tìm campaign và kiểm tra quyền
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) {
    throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
  }

  const campaign = await Campaign.findOne({
    where: {
      campaign_id: campaignId,
      charity_id: charity.charity_id,
    },
  });

  if (!campaign) {
    throw new AppError('Không tìm thấy chiến dịch hoặc bạn không có quyền', 404);
  }

  // Tạo URL cho ảnh
  const imageUrl = `/uploads/campaigns/${file.filename}`;

  // Cập nhật image_url chính của campaign
  await campaign.update({ image_url: imageUrl });

  logger.info(`Campaign image uploaded: ${campaign.title}, file: ${file.filename}`);
  return {
    message: 'Upload ảnh chiến dịch thành công',
    image_url: imageUrl,
    campaign: campaign,
  };
};

/**
 * Upload nhiều ảnh cho campaign
 */
exports.uploadImages = async (campaignId, files, userId) => {
  if (!files || files.length === 0) {
    throw new AppError('Không có file được upload', 400);
  }

  // Tìm campaign và kiểm tra quyền
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) {
    throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
  }

  const campaign = await Campaign.findOne({
    where: {
      campaign_id: campaignId,
      charity_id: charity.charity_id,
    },
  });

  if (!campaign) {
    throw new AppError('Không tìm thấy chiến dịch hoặc bạn không có quyền', 404);
  }

  // Tạo URLs cho các ảnh
  const uploadedImages = files.map((file) => `/uploads/campaigns/${file.filename}`);

  // Lấy gallery hiện tại và thêm ảnh mới
  const currentGallery = campaign.gallery || [];
  const updatedGallery = [...currentGallery, ...uploadedImages];

  // Cập nhật gallery của campaign
  await campaign.update({ gallery: updatedGallery });

  logger.info(`Campaign images uploaded: ${campaign.title}, files: ${files.map((f) => f.filename).join(', ')}`);
  return {
    message: `Upload ${files.length} ảnh chiến dịch thành công`,
    uploaded_images: uploadedImages,
    campaign: campaign,
  };
};
