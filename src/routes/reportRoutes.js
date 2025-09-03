const express = require('express');
const router = express.Router();

const reportController = require('../controllers/reportCampaignController');

// GET /api/admin/report-campaigns
router.get('/', reportController.getAllReports);

// GET /api/admin/report-campaigns/:reportId
router.get('/:reportId', reportController.getReportById);

// PUT /api/admin/report-campaigns/:reportId/status
router.put('/:reportId/status', reportController.updateReportStatus);

// DELETE /api/admin/report-campaigns/:reportId
router.delete('/:reportId', reportController.deleteReport);

module.exports = router;
