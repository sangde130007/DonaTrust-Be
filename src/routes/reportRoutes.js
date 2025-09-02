const express = require('express');
const router = express.Router();

const reportController = require('../controllers/reportCampaignController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');


router.use(authMiddleware);
router.use(requireAdmin);

router.get('/', reportController.getAllReports);

router.get('/:reportId', reportController.getReportById);

router.patch('/:reportId/status', reportController.updateReportStatus);

router.delete('/:reportId', reportController.deleteReport);

module.exports = router;