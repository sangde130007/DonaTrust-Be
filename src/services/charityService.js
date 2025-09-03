// src/services/charityService.js
const Charity = require('../models/Charity');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const FinancialReport = require('../models/FinancialReport');
const { AppError } = require('../utils/errorHandler');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const logger = require('../utils/logger');

/* ========== Helpers ========== */
const str = (v) => (typeof v === 'string' ? v.trim() : v);

exports.create = async (data) => {
  const charity = await Charity.create(data);
  return charity;
};

exports.getAll = async () => {
  return await Charity.findAll();
};

exports.getById = async (id) => {
  const charity = await Charity.findByPk(id);
  if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
  return charity;
};

exports.update = async (id, data) => {
  const charity = await Charity.findByPk(id);
  if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
  await charity.update(data);
  return charity;
};

exports.delete = async (id) => {
  const charity = await Charity.findByPk(id);
  if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
  await charity.destroy();
};

/**
 * Đăng ký tổ chức từ thiện (donor nộp đơn)
 * - Không yêu cầu user đã có role 'charity'
 * - Tạo Charity với verification_status = 'pending'
 * - Chặn nộp trùng theo user_id
 * - Map license_url -> license_document để Admin xem được link
 */
exports.registerCharity = async (userId, charityData = {}) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);

  // Đã có hồ sơ/charity gắn với user này?
  const existingCharity = await Charity.findOne({ where: { user_id: userId } });
  if (existingCharity) {
    throw new AppError('Bạn đã nộp đơn hoặc đã có tổ chức từ thiện', 400);
  }

  // Kiểm tra license_number unique (nếu có)
  if (str(charityData.license_number)) {
    const existed = await Charity.findOne({
      where: { license_number: str(charityData.license_number) },
    });
    if (existed) {
      throw new AppError('Số giấy phép này đã được sử dụng', 400);
    }
  }

  // Chuẩn hoá field vào DB
  const name = str(charityData.name);
  const description = str(charityData.description);
  const mission = str(charityData.mission);
  const address = str(charityData.address);
  const city = str(charityData.city);
  const phone = str(charityData.phone);
  const email = str(charityData.email);
  const website_url = str(charityData.website_url);
  const license_number = str(charityData.license_number);

  // Map URL file (controller đã build absolute/relative hợp lệ)
  const license_url = str(charityData.license_url) || str(charityData.license_document) || null;
  const description_url = str(charityData.description_url) || str(charityData.description_document) || null;
  const logo_url = str(charityData.logo_url) || null;

  // verification_documents (JSON) – lưu thêm record để tham khảo sau này
  const verification_documents = [];
  if (license_url) {
    verification_documents.push({
      id: Date.now().toString() + '_license',
      type: 'license',
      url: license_url,
      uploaded_at: new Date().toISOString(),
    });
  }
  if (description_url) {
    verification_documents.push({
      id: Date.now().toString() + '_description',
      type: 'description',
      url: description_url,
      uploaded_at: new Date().toISOString(),
    });
  }

  const charity = await Charity.create({
    user_id: userId,
    name,
    description,
    mission,
    license_number,
    address,
    city,
    phone,
    email,
    website_url,

    // Trạng thái
    verification_status: 'pending',
    rejection_reason: null,

    // Lưu đường dẫn tài liệu để Admin mở nhanh
    license_document: license_url || null,
    // nếu model có cột riêng cho mô tả tài liệu, map vào đây; nếu không có, vẫn giữ trong verification_documents
    description_document: description_url || null,

    // Logo (nếu model có cột này)
    logo_url: logo_url || null,

    // Lưu JSON minh chứng
    verification_documents: verification_documents.length ? verification_documents : [],
  });

  logger.info(`Charity registered (pending): ${charity.name} by user ${userId}`);
  return charity;
};

/**
 * Lấy thông tin charity của user hiện tại
 * - Trả về null nếu chưa nộp (để controller tự xử lý message)
 */
exports.getMyCharity = async (userId) => {
  const charity = await Charity.findOne({
    where: { user_id: userId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['user_id', 'full_name', 'email', 'phone'],
      },
    ],
  });

  return charity || null;
};

/**
 * Cập nhật thông tin charity của chính user
 * - Map license_url -> license_document nếu FE gửi theo dạng mới
 */
exports.updateMyCharity = async (userId, updateData = {}) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);

  // Check license_number unique nếu thay đổi
  if (
    str(updateData.license_number) &&
    str(updateData.license_number) !== str(charity.license_number)
  ) {
    const existed = await Charity.findOne({
      where: {
        license_number: str(updateData.license_number),
        charity_id: { [Op.ne]: charity.charity_id },
      },
    });
    if (existed) throw new AppError('Số giấy phép này đã được sử dụng', 400);
  }

  // Map các URL mới (nếu FE gửi)
  const patched = { ...updateData };
  if (str(updateData.license_url)) {
    patched.license_document = str(updateData.license_url);
  }
  if (str(updateData.description_url)) {
    patched.description_document = str(updateData.description_url);
  }

  await charity.update(patched);
  logger.info(`Charity updated: ${charity.name} by user ${userId}`);
  return charity;
};

/**
 * ADMIN: Duyệt/Từ chối charity và (nếu duyệt) đổi role user => 'charity'
 * - Thực hiện trong transaction
 */
exports.verifyCharity = async (charityId, { status, rejection_reason, admin_id }) => {
  if (!['verified', 'rejected'].includes(status)) {
    throw new AppError('Trạng thái không hợp lệ', 400);
  }

  return await sequelize.transaction(async (t) => {
    const charity = await Charity.findByPk(charityId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!charity) throw new AppError('Không tìm thấy charity', 404);

    const user = await User.findByPk(charity.user_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) throw new AppError('Không tìm thấy user', 404);

    if (status === 'verified') {
      await charity.update(
        {
          verification_status: 'verified',
          verified_at: new Date(),
          verified_by: admin_id,
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
          rejection_reason: str(rejection_reason) || 'Không đạt yêu cầu',
          verified_at: null,
          verified_by: null,
        },
        { transaction: t }
      );
    }

    logger.info(
      `Admin ${admin_id} set charity ${charity.charity_id} -> ${status}; user ${user.user_id} role: ${user.role}`
    );

    return { charity, user };
  });
};

/**
 * Lấy tất cả charity (public)
 */
exports.getAllCharities = async (filters = {}) => {
  const {
    page = 1,
    limit = 10,
    search,
    verification_status = 'verified',
    city,
    category, // để sẵn nếu sau này có
    sort = 'created_at',
    order = 'DESC',
  } = filters;

  const offset = (page - 1) * limit;
  const whereClause = { verification_status };

  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { mission: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (city) whereClause.city = city;

  const charities = await Charity.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['full_name'],
      },
    ],
    attributes: { exclude: ['bank_account', 'verification_documents'] },
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sort, String(order).toUpperCase()]],
  });

  return {
    charities: charities.rows,
    total: charities.count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(charities.count / limit),
  };
};

/**
 * Lấy charity theo ID (public)
 */
exports.getCharityById = async (charityId) => {
  const charity = await Charity.findByPk(charityId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['user_id', 'full_name', 'email', 'phone'],
      },
      {
        model: Campaign,
        as: 'campaigns',
        where: { status: 'active' },
        required: false,
        attributes: ['campaign_id', 'title', 'goal_amount', 'current_amount', 'end_date'],
      },
    ],
    attributes: { exclude: ['bank_account'] },
  });

  if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
  return charity;
};

/**
 * Xóa charity (chỉ admin hoặc chính charity đó)
 */
exports.deleteCharity = async (charityId, userId, userRole) => {
  const charity = await Charity.findByPk(charityId);
  if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);

  if (userRole !== 'admin' && charity.user_id !== userId) {
    throw new AppError('Bạn không có quyền xóa tổ chức từ thiện này', 403);
  }

  const activeCampaigns = await Campaign.count({
    where: { charity_id: charityId },
  });

  if (activeCampaigns > 0) {
    throw new AppError('Không thể xóa tổ chức từ thiện có campaign đang active', 400);
  }

  await charity.destroy();
};

/**
 * Upload tài liệu cho charity
 */
exports.uploadDocument = async (userId, file, documentData = {}) => {
  if (!file) throw new AppError('Không có file được upload', 400);

  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const documentUrl = `/uploads/documents/${file.filename}`;
  const currentDocuments = Array.isArray(charity.verification_documents)
    ? charity.verification_documents
    : [];

  const newDocument = {
    id: Date.now().toString(),
    filename: file.filename,
    url: documentUrl,
    type: documentData.document_type || 'other',
    description: documentData.description || '',
    uploaded_at: new Date().toISOString(),
    size: file.size,
    mimetype: file.mimetype,
  };

  const updatedDocuments = [...currentDocuments, newDocument];

  await charity.update({
    verification_documents: updatedDocuments,
    ...(documentData.document_type === 'license' && { license_document: documentUrl }),
  });

  logger.info(`Document uploaded for charity: ${charity.name}, file: ${file.filename}`);
  return {
    message: 'Upload tài liệu thành công',
    document_url: documentUrl,
    document_info: newDocument,
    charity,
  };
};

/**
 * Lấy thống kê charity
 */
exports.getCharityStats = async (userId) => {
  const charity = await Charity.findOne({ where: { user_id: userId } });
  if (!charity) throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);

  const S = require('sequelize');
  const campaignStats = await Campaign.findAll({
    where: { charity_id: charity.charity_id },
    attributes: [
      [S.fn('COUNT', S.col('campaign_id')), 'total_campaigns'],
      [S.fn('SUM', S.col('current_amount')), 'total_raised'],
      [S.fn('AVG', S.col('current_amount')), 'avg_raised_per_campaign'],
    ],
    raw: true,
  });

  const statusStats = await Campaign.findAll({
    where: { charity_id: charity.charity_id },
    attributes: ['status', [S.fn('COUNT', S.col('campaign_id')), 'count']],
    group: ['status'],
    raw: true,
  });

  const reportStats = await FinancialReport.findAll({
    where: { charity_id: charity.charity_id },
    attributes: [[S.fn('COUNT', S.col('report_id')), 'total_reports']],
    raw: true,
  });

  return {
    charity_info: {
      name: charity.name,
      verification_status: charity.verification_status,
      rating: charity.rating,
      active_campaigns: charity.active_campaigns,
    },
    campaign_stats: {
      total_campaigns: parseInt(campaignStats[0]?.total_campaigns) || 0,
      total_raised: parseFloat(campaignStats[0]?.total_raised) || 0,
      avg_raised_per_campaign: parseFloat(campaignStats[0]?.avg_raised_per_campaign) || 0,
      by_status: statusStats,
    },
    financial_stats: {
      total_reports: parseInt(reportStats[0]?.total_reports) || 0,
    },
  };
};
