const Campaign = require('../models/Campaign');
const Charity = require('../models/Charity');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Tạo campaign mới theo payload trực tiếp (dùng cho nơi khác cần)
 * payload: {
 *   charity_id, title, fedescription, detailed_description, goal_amount,
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

  // Đảm bảo charity tồn tại & đã xác minh
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
    status: 'pending',
    approval_status: 'pending',
    dao_approval_status: null,
  });

  if (typeof charity.active_campaigns === 'number') {
    await charity.update({ active_campaigns: (charity.active_campaigns || 0) + 1 });
  }

  return campaign;
}

/**
 * Tạo campaign mới (charity của user). Có thể nhận file QR.
 */
exports.createCampaign = async (userId, campaignData, file) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
  if (charity.verification_status !== 'verified') {
    throw new AppError('Tổ chức từ thiện chưa được xác minh', 403);
  }

  // Validate dates
  const startDate = new Date(campaignData.start_date);
  const endDate = new Date(campaignData.end_date);
  const today = new Date();
  if (isNaN(startDate) || isNaN(endDate)) {
    throw new AppError('Ngày bắt đầu/kết thúc không hợp lệ', 400);
  }
  if (startDate < today) throw new AppError('Ngày bắt đầu không thể là quá khứ', 400);
  if (endDate <= startDate) throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', 400);

  const qr_code_url = file
    ? `/uploads/campaigns/${file.filename}`
    : (campaignData.qr_code_url?.trim() || null);

  // Tạo campaign — set rõ field để tránh ghi bừa
  const campaign = await Campaign.create({
    title: campaignData.title,
    description: campaignData.description,
    detailed_description: campaignData.detailed_description || null,
    goal_amount: Number(campaignData.goal_amount),
    start_date: campaignData.start_date,
    end_date: campaignData.end_date,
    category: campaignData.category,
    location: campaignData.location || null,
    image_url: campaignData.image_url || null,
    gallery_images: Array.isArray(campaignData.gallery_images) ? campaignData.gallery_images : [],
    qr_code_url,
    charity_id: charity.charity_id,
    status: 'pending',           // ban đầu pending
    approval_status: 'pending',  // chờ DAO vote + admin duyệt
    dao_approval_status: null,
  });

  await charity.update({
    active_campaigns: (charity.active_campaigns || 0) + 1,
  });

  logger.info(`Campaign created for DAO voting: ${campaign.title} by charity ${charity.name}`);
  return campaign;
};

/**
 * Lấy tất cả campaigns của charity (của tôi)
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
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [[sort, String(order).toUpperCase()]],
  });

  return {
    campaigns: campaigns.rows,
    total: campaigns.count,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(campaigns.count / limit),
  };
};

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
 * Cập nhật campaign (phòng thủ: updateData = {})
 * - Validate ngày khi có truyền
 * - Hợp nhất gallery từ _keep_gallery + _new_gallery
 */
exports.updateMyCampaign = async (userId, campaignId, updateData = {}) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const campaign = await Campaign.findOne({
    where: { campaign_id: campaignId, charity_id: charity.charity_id },
  });
  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);

  // Không cho phép sửa campaign đang active hoặc completed
  if (['active', 'completed'].includes(campaign.status)) {
    throw new AppError('Không thể sửa chiến dịch đang hoạt động hoặc đã hoàn thành', 400);
  }

  // Chuẩn hoá số
  if (updateData.goal_amount != null) {
    updateData.goal_amount = Number(updateData.goal_amount);
  }

  // Validate dates nếu có thay đổi
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

  // Hợp nhất gallery nếu có chỉ thị tạm
  if (updateData._keep_gallery || updateData._new_gallery) {
    const current = Array.isArray(campaign.gallery_images) ? campaign.gallery_images : [];
    const keep = Array.isArray(updateData._keep_gallery) ? updateData._keep_gallery : [];
    const add = Array.isArray(updateData._new_gallery) ? updateData._new_gallery : [];
    updateData.gallery_images = [...keep, ...add];

    delete updateData._keep_gallery;
    delete updateData._new_gallery;
  }

  await campaign.update(updateData);

  logger.info(`Campaign updated: ${campaign.title} by charity ${charity.name}`);
  return campaign;
};

/**
 * Xoá campaign
 */
exports.deleteMyCampaign = async (userId, campaignId) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const campaign = await Campaign.findOne({
    where: { campaign_id: campaignId, charity_id: charity.charity_id },
  });
  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);

  // Kiểm tra có donation chưa
  const donationCount = await Donation.count({ where: { campaign_id: campaignId } });
  if (donationCount > 0) {
    throw new AppError('Không thể xóa chiến dịch đã có người quyên góp', 400);
  }

  await campaign.destroy();

  await charity.update({
    active_campaigns: Math.max(0, (charity.active_campaigns || 0) - 1),
  });

  logger.info(`Campaign deleted: ${campaign.title} by charity ${charity.name}`);
  return { message: 'Đã xóa chiến dịch thành công' };
};

/**
 * Thêm progress update
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

  const currentUpdates = Array.isArray(campaign.progress_updates) ? campaign.progress_updates : [];
  const updatedUpdates = [newUpdate, ...currentUpdates];

  await campaign.update({ progress_updates: updatedUpdates });

  logger.info(`Progress update added to campaign: ${campaign.title}`);
  return campaign;
};

/**
 * Lấy thống kê campaign
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

  const total_amount = donations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
  const goal = parseFloat(campaign.goal_amount || 0);
  const current = parseFloat(campaign.current_amount || 0);

  const stats = {
    total_donations: donations.length,
    total_amount,
    average_donation: donations.length > 0 ? total_amount / donations.length : 0,
    goal_percentage: goal > 0 ? ((current / goal) * 100).toFixed(2) : '0.00',
    recent_donations: donations.slice(0, 10),
    days_remaining: Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24))),
  };

  return stats;
};

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
    whereClause.featured =
      typeof featured === 'string'
        ? featured.toLowerCase() === 'true'
        : !!featured;
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
        as: 'charity', // 👈 alias từ associations
        attributes: ['charity_id', 'name', 'logo_url', 'verification_status'],
        where: { verification_status: 'verified' },
        required: true,
        include: [
          {
            model: User,
            as: 'user', // 👈 alias từ associations
            attributes: [],
            where: { status: 'active' },
            required: true,
          },
        ],
      },
    ],
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [[sort, String(order).toUpperCase()]],
  });

  return {
    campaigns: campaigns.rows,
    total: campaigns.count,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(campaigns.count / limit),
  };
};



exports.getCampaignById = async (campaignId) => {
  const campaign = await Campaign.findOne({
    where: { campaign_id: campaignId, approval_status: 'approved' },
    include: [
      {
        model: Charity,
        as: 'charity', // 👈 alias đúng
        attributes: [
          'charity_id',
          'user_id',
          'name',
          'logo_url',
          'verification_status',
          'rating',
        ],
        where: { verification_status: 'verified' },
        required: true,
        include: [
          {
            model: User,
            as: 'user', // 👈 alias đúng
            attributes: [],
            where: { status: 'active' },
            required: true,
          },
        ],
      },
    ],
  });

  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);

  await campaign.update({ views: (campaign.views || 0) + 1 });

  return campaign;
};



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
 * Upload nhiều ảnh cho campaign (cập nhật gallery_images)
 * - `files` có thể là mảng file, hoặc dạng { images: [file, ...] }
 */
exports.uploadImages = async (campaignId, files, userId) => {
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

  logger.info(`Campaign images uploaded: ${campaign.title}, files: ${list.map((f) => f.filename).join(', ')}`);
  return {
    message: `Upload ${list.length} ảnh chiến dịch thành công`,
    uploaded_images: uploadedImages,
    campaign,
  };
};

// Export thêm hàm create cho nơi khác dùng
exports.create = create;
