  // services/reportCampaignService.js
  const { Op } = require('sequelize');
  // 👇 Quan trọng: import từ index để lấy instance đã associate
  const { ReportCampaign, Campaign, User } = require('../models/associations.js');
  const { AppError } = require('../utils/errorHandler');
  const logger = require('../utils/logger');

  /**
   * (User) Tạo báo cáo chiến dịch
   */
  exports.createReport = async (payload) => {
    const { campaign_id, reporter_id, reasons, other_reason, description, evidence_files } = payload;

    const campaign = await Campaign.findByPk(campaign_id);
    if (!campaign) throw new AppError('Không tìm thấy chiến dịch để báo cáo', 404);

    const existingReport = await ReportCampaign.findOne({
      where: { campaign_id, reporter_id },
    });
    if (existingReport) throw new AppError('Bạn đã báo cáo chiến dịch này rồi', 409);

    const report = await ReportCampaign.create({
      campaign_id,
      reporter_id,
      reasons,
      other_reason,
      description,
      evidence_files,
      status: 'pending',
    });

    logger.info(`New report created (ID: ${report.report_id}) for campaign (ID: ${campaign_id}) by user (ID: ${reporter_id})`);
    return report;
  };

  /**
   * (User) Danh sách báo cáo theo reporter
   */
  exports.getReportsByReporterId = async (reporterId, { page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;

    const { count, rows } = await ReportCampaign.findAndCountAll({
      where: { reporter_id: reporterId },
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['campaign_id', 'title', 'image_url'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      items: rows,
      pagination: {
        page: Number(page),
        pageSize: Number(limit),
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    };
  };

  /**
   * (Admin) Lấy tất cả báo cáo với lọc/ tìm kiếm/ sort/ phân trang
   * FE gửi: page, pageSize, status, search, sortBy, sortOrder
   */
  exports.getAllReports = async (opts = {}) => {
    const page = Number(opts.page || 1);
    const pageSize = Number(opts.pageSize || opts.limit || 20);
    const offset = (page - 1) * pageSize;

    const status = opts.status;
    const search = String(opts.search || '').trim();
    const sortBy = opts.sortBy || 'created_at';
    const sortOrder = String(opts.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const where = {};
    if (status && ['pending', 'resolved', 'dismissed'].includes(status)) where.status = status;

    const include = [
      {
        model: Campaign,
        as: 'campaign',
        attributes: ['campaign_id', 'title'],
        required: false,
      },
      {
        model: User,
        as: 'reporter',
        attributes: ['user_id', 'full_name', 'email'],
        required: false,
      },
    ];

    // Tìm theo campaign.title / reporter.full_name / reporter.email / report_id
    const orConds = [];
    if (search) {
      const like = { [Op.iLike]: `%${search}%` };
      const asNum = Number(search);
      if (!Number.isNaN(asNum)) orConds.push({ report_id: asNum });
      orConds.push({ '$campaign.title$': like });
      orConds.push({ '$reporter.full_name$': like });
      orConds.push({ '$reporter.email$': like });
    }

    // Mapping sort keys -> alias
    const sortKeyMap = {
      created_at: ['created_at'],
      updated_at: ['updated_at'],
      status: ['status'],
      campaign_title: [{ model: Campaign, as: 'campaign' }, 'title'],
      reporter_name: [{ model: User, as: 'reporter' }, 'full_name'],
    };
    const sortKey = sortKeyMap[sortBy] || ['created_at'];
    const order = [[...sortKey, sortOrder]];

    const { rows, count } = await ReportCampaign.findAndCountAll({
      where: {
        ...where,
        ...(orConds.length ? { [Op.or]: orConds } : {}),
      },
      include,
      order,
      limit: pageSize,
      offset,
    });

    return {
      items: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize) || 1,
      },
    };
  };

  /**
   * (Admin) Chi tiết báo cáo
   */
  exports.getReportById = async (reportId) => {
    const report = await ReportCampaign.findByPk(reportId, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['campaign_id', 'title', 'image_url'],
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['user_id', 'full_name', 'email', 'avatar_url'],
        },
      ],
    });
    if (!report) throw new AppError('Không tìm thấy báo cáo', 404);
    return report;
  };

  /**
   * (Admin) Cập nhật trạng thái báo cáo
   */
  exports.updateReportStatus = async (reportId, status) => {
    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
      throw new AppError('Trạng thái không hợp lệ.', 400);
    }
    const report = await ReportCampaign.findByPk(reportId);
    if (!report) throw new AppError('Không tìm thấy báo cáo để cập nhật', 404);

    await report.update({ status });
    logger.info(`Report (ID: ${reportId}) status updated to: ${status}`);
    return report;
  };

  /**
   * (Admin) Xoá báo cáo
   */
  exports.deleteReport = async (reportId) => {
    const report = await ReportCampaign.findByPk(reportId);
    if (!report) throw new AppError('Không tìm thấy báo cáo để xóa', 404);

    await report.destroy();
    logger.info(`Report (ID: ${reportId}) has been deleted.`);
    return { message: 'Đã xóa báo cáo thành công' };
  };
