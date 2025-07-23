const DaoApplication = require('../models/DaoApplication');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { DAO_APPLICATION_STATUS, ROLES } = require('../config/constants');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * Đăng ký DAO member
 */
exports.registerDao = async (userId, applicationData, files) => {
  // Kiểm tra user tồn tại
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('Không tìm thấy người dùng', 404);
  }

  // Kiểm tra đã đăng ký chưa
  const existingApplication = await DaoApplication.findOne({ where: { user_id: userId } });
  if (existingApplication) {
    throw new AppError('Bạn đã gửi đơn đăng ký DAO member rồi', 400);
  }

  // Kiểm tra user đã là DAO member chưa
  if (user.role === ROLES.DAO_MEMBER) {
    throw new AppError('Bạn đã là DAO member rồi', 400);
  }

  // Xử lý file certificates
  let certificateFiles = [];
  if (files && files.length > 0) {
    certificateFiles = files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date(),
    }));
  }

  // Tạo đơn đăng ký
  const application = await DaoApplication.create({
    user_id: userId,
    full_name: applicationData.fullName,
    email: applicationData.email,
    introduction: applicationData.introduction,
    experience: applicationData.experience,
    areas_of_interest: applicationData.areasOfInterest,
    certificate_files: certificateFiles,
    status: DAO_APPLICATION_STATUS.PENDING,
  });

  logger.info(`DAO application submitted by user ${userId}`);
  return application;
};

/**
 * Lấy đơn đăng ký DAO của user hiện tại
 */
exports.getMyApplication = async (userId) => {
  const application = await DaoApplication.findOne({
    where: { user_id: userId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['user_id', 'full_name', 'email', 'phone', 'role'],
      },
    ],
  });

  if (!application) {
    throw new AppError('Bạn chưa gửi đơn đăng ký DAO member', 404);
  }

  return application;
};

/**
 * Lấy tất cả đơn đăng ký DAO (admin only)
 */
exports.getAllApplications = async (page = 1, limit = 10, status = null) => {
  const offset = (page - 1) * limit;
  const whereClause = {};

  if (status) {
    whereClause.status = status;
  }

  const { count, rows } = await DaoApplication.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['user_id', 'full_name', 'email', 'phone', 'role'],
      },
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  return {
    applications: rows,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    totalItems: count,
  };
};

/**
 * Lấy chi tiết đơn đăng ký (admin only)
 */
exports.getApplicationById = async (applicationId) => {
  const application = await DaoApplication.findByPk(applicationId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['user_id', 'full_name', 'email', 'phone', 'role'],
      },
    ],
  });

  if (!application) {
    throw new AppError('Không tìm thấy đơn đăng ký', 404);
  }

  return application;
};

/**
 * Duyệt đơn đăng ký DAO (admin only)
 */
exports.approveApplication = async (applicationId, adminId) => {
  const application = await DaoApplication.findByPk(applicationId, {
    include: [
      {
        model: User,
        as: 'user',
      },
    ],
  });

  if (!application) {
    throw new AppError('Không tìm thấy đơn đăng ký', 404);
  }

  if (application.status !== DAO_APPLICATION_STATUS.PENDING) {
    throw new AppError('Đơn đăng ký đã được xử lý rồi', 400);
  }

  // Cập nhật application
  await application.update({
    status: DAO_APPLICATION_STATUS.APPROVED,
    reviewed_by: adminId,
    reviewed_at: new Date(),
  });

  // Cập nhật user role và thông tin DAO
  await application.user.update({
    role: ROLES.DAO_MEMBER,
    dao_approved_at: new Date(),
    dao_approved_by: adminId,
  });

  logger.info(`DAO application approved: ${applicationId} by admin ${adminId}`);
  return application;
};

/**
 * Từ chối đơn đăng ký DAO (admin only)
 */
exports.rejectApplication = async (applicationId, adminId, rejectionReason) => {
  const application = await DaoApplication.findByPk(applicationId, {
    include: [
      {
        model: User,
        as: 'user',
      },
    ],
  });

  if (!application) {
    throw new AppError('Không tìm thấy đơn đăng ký', 404);
  }

  if (application.status !== DAO_APPLICATION_STATUS.PENDING) {
    throw new AppError('Đơn đăng ký đã được xử lý rồi', 400);
  }

  // Cập nhật application
  await application.update({
    status: DAO_APPLICATION_STATUS.REJECTED,
    reviewed_by: adminId,
    reviewed_at: new Date(),
    rejection_reason: rejectionReason,
  });

  // Cập nhật user thông tin DAO
  await application.user.update({
    dao_rejected_at: new Date(),
    dao_rejected_by: adminId,
    dao_rejection_reason: rejectionReason,
  });

  logger.info(`DAO application rejected: ${applicationId} by admin ${adminId}`);
  return application;
};

/**
 * Xóa file certificate
 */
exports.deleteCertificateFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Certificate file deleted: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Error deleting certificate file: ${filePath}`, error);
  }
}; 