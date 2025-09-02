const { body, param } = require('express-validator');
const reportCampaignService = require('../services/reportCampaignService');
const validate = require('../middleware/validationMiddleware');
const { uploadReportFiles } = require('../middleware/uploadMiddleware');


// ================== AUTHENTICATED USER ==================

/**
 * POST /api/campaigns/:campaignId/report
 * Người dùng tạo một báo cáo mới cho chiến dịch.
 */
exports.createReport = [
  uploadReportFiles,
  param('campaignId').isUUID().withMessage('Campaign ID không hợp lệ'),
  body('reasons').notEmpty().withMessage('Lý do báo cáo là bắt buộc.'),
  body('description').optional().isString(),
  body('otherReason').optional().isString(),
  validate,
  async (req, res, next) => {
    try {
      const { campaignId } = req.params;
      const reporter_id = req.user?.user_id || req.user?.id;
      const { reasons, otherReason, description } = req.body;
      
      const evidence_files = req.files ? req.files.map(file => `/uploads/reports/${file.filename}`) : [];

      let parsedReasons;
      try {
        parsedReasons = JSON.parse(reasons);
        if (!Array.isArray(parsedReasons) || parsedReasons.length === 0) {
          return res.status(400).json({ message: '`reasons` phải là một mảng JSON không rỗng.' });
        }
      } catch (e) {
        return res.status(400).json({ message: '`reasons` không phải là một chuỗi JSON hợp lệ.' });
      }

      const reportData = {
        campaign_id: campaignId,
        reporter_id,
        reasons: parsedReasons,
        other_reason: otherReason || null,
        description: description || null,
        evidence_files,
      };

      const newReport = await reportCampaignService.createReport(reportData);
      res.status(201).json({ message: 'Báo cáo chiến dịch thành công', report: newReport });
    } catch (error) {
      next(error);
    }
  },
];


// ================== ADMIN ONLY ==================

/**
 * GET /api/reports
 * Admin lấy tất cả báo cáo.
 */
exports.getAllReports = [
  validate,
  async (req, res, next) => {
    try {
      const result = await reportCampaignService.getAllReports(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * GET /api/reports/:reportId
 * Admin lấy chi tiết một báo cáo.
 */
exports.getReportById = [
  validate,
  param('reportId').isInt({ min: 1 }).withMessage('Report ID không hợp lệ'),
  async (req, res, next) => {
    try {
      const report = await reportCampaignService.getReportById(req.params.reportId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * PATCH /api/reports/:reportId/status
 * Admin cập nhật trạng thái của báo cáo.
 */
exports.updateReportStatus = [
  param('reportId').isInt({ min: 1 }).withMessage('Report ID không hợp lệ'),
  body('status').isIn(['pending', 'resolved', 'dismissed']).withMessage('Trạng thái không hợp lệ.'),
  validate,
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { status } = req.body;
      const updatedReport = await reportCampaignService.updateReportStatus(reportId, status);
      res.json({ message: 'Cập nhật trạng thái báo cáo thành công', report: updatedReport });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * DELETE /api/reports/:reportId
 * Admin xóa một báo cáo.
 */
exports.deleteReport = [
  param('reportId').isInt({ min: 1 }).withMessage('Report ID không hợp lệ'),
  validate,
  async (req, res, next) => {
    try {
      await reportCampaignService.deleteReport(req.params.reportId);
      res.status(200).json({ message: 'Đã xóa báo cáo thành công' });
    } catch (error) {
      next(error);
    }
  },
];

