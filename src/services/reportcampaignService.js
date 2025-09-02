// services/reportCampaignService.js
const ReportCampaign = require('../models/ReportCampaign');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Tạo một báo cáo mới cho chiến dịch. (Dành cho User)
 * @param {object} payload - Dữ liệu báo cáo từ controller.
 * @returns {Promise<ReportCampaign>} Báo cáo vừa được tạo.
 */
exports.createReport = async (payload) => {
  const { campaign_id, reporter_id, reasons, other_reason, description, evidence_files } = payload;

  const campaign = await Campaign.findByPk(campaign_id);
  if (!campaign) {
    throw new AppError('Không tìm thấy chiến dịch để báo cáo', 404);
  }

  const existingReport = await ReportCampaign.findOne({
    where: { campaign_id, reporter_id },
  });
  if (existingReport) {
    throw new AppError('Bạn đã báo cáo chiến dịch này rồi', 409);
  }

  const report = await ReportCampaign.create({
    campaign_id,
    reporter_id,
    reasons,
    other_reason,
    description,
    evidence_files,
    status: 'pending'
  });

  logger.info(`New report created (ID: ${report.report_id}) for campaign (ID: ${campaign_id}) by user (ID: ${reporter_id})`);
  return report;
};

/**
 * Lấy danh sách các báo cáo do một người dùng cụ thể tạo. (Dành cho User)
 * @param {string} reporterId - ID của người dùng.
 * @param {object} options - Tùy chọn truy vấn { page, limit }.
 * @returns {Promise<object>} Danh sách báo cáo và thông tin phân trang.
 */
exports.getReportsByReporterId = async (reporterId, { page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;

  const { count, rows } = await ReportCampaign.findAndCountAll({
    where: { reporter_id: reporterId },
    include: [
      {
        model: Campaign,
        attributes: ['campaign_id', 'title', 'image_url']
      }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    reports: rows,
    pagination: {
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
      totalReports: count,
    },
  };
};


// ================== ADMIN FUNCTIONS ==================


/**
 * Lấy tất cả báo cáo với tùy chọn lọc, phân trang (dành cho admin).
 * @param {object} options - Tùy chọn truy vấn { page, limit, sort, order, status }.
 * @returns {Promise<object>} Danh sách báo cáo và thông tin phân trang.
 */
exports.getAllReports = async ({ page = 1, limit = 10, sort = 'created_at', order = 'DESC', status }) => {
  const offset = (page - 1) * limit;
  const validSortColumns = ['report_id', 'created_at', 'status'];
  const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const whereClause = {};
  if (status) {
    whereClause.status = status;
  }

  const { count, rows } = await ReportCampaign.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Campaign,
        attributes: ['campaign_id', 'title']
      },
      {
        model: User,
        as: 'reporter', // Giả sử bạn có alias 'reporter' trong model association
        attributes: ['user_id', 'username']
      }
    ],
    order: [[sortColumn, sortOrder]],
    limit,
    offset,
  });

  return {
    reports: rows,
    pagination: {
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
      totalReports: count,
    },
  };
};

/**
 * Lấy chi tiết một báo cáo bằng ID (dành cho admin).
 * @param {number} reportId - ID của báo cáo.
 * @returns {Promise<ReportCampaign>} Chi tiết báo cáo.
 */
exports.getReportById = async (reportId) => {
  const report = await ReportCampaign.findByPk(reportId, {
    include: [
      {
        model: Campaign,
        attributes: ['campaign_id', 'title', 'image_url']
      },
      {
        model: User,
        as: 'reporter',
        attributes: ['user_id', 'username', 'avatar_url']
      }
    ]
  });

  if (!report) {
    throw new AppError('Không tìm thấy báo cáo', 404);
  }
  return report;
};

/**
 * Cập nhật trạng thái một báo cáo (dành cho admin).
 * @param {number} reportId - ID của báo cáo.
 * @param {string} status - Trạng thái mới ('pending', 'resolved', 'dismissed').
 * @returns {Promise<ReportCampaign>} Báo cáo sau khi cập nhật.
 */
exports.updateReportStatus = async (reportId, status) => {
  const report = await ReportCampaign.findByPk(reportId);
  if (!report) {
    throw new AppError('Không tìm thấy báo cáo để cập nhật', 404);
  }

  await report.update({ status });
  logger.info(`Report (ID: ${reportId}) status updated to: ${status}`);
  return report;
};

/**
 * Xóa một báo cáo (dành cho admin).
 * @param {number} reportId - ID của báo cáo.
 * @returns {Promise<{message: string}>} Thông báo thành công.
 */
exports.deleteReport = async (reportId) => {
  const report = await ReportCampaign.findByPk(reportId);
  if (!report) {
    throw new AppError('Không tìm thấy báo cáo để xóa', 404);
  }

  await report.destroy();
  logger.info(`Report (ID: ${reportId}) has been deleted.`);
  return { message: 'Đã xóa báo cáo thành công' };
};

