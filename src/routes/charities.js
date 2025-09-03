// src/routes/charityRoutes.js
const express = require('express');
const router = express.Router();

const charityController = require('../controllers/charityController');
const authMiddleware = require('../middleware/authMiddleware');
const {
  uploadDocument,
  uploadCharityRegistration,
  handleMulterError,
} = require('../middleware/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   name: Charity Management
 *   description: API quản lý tổ chức từ thiện
 */

/* ===================== Public (no auth) ===================== */
router.get('/', charityController.getAllCharities);

/* ===================== Protected (require auth) ===================== */
router.use(authMiddleware);

/* -------- Campaign management -------- */
router.post('/campaigns', charityController.createCampaign);
router.get('/campaigns', charityController.getMyCampaigns);
router.get('/campaigns/:id', charityController.getMyCampaignById);
router.put('/campaigns/:id', charityController.updateMyCampaign);
router.delete('/campaigns/:id', charityController.deleteMyCampaign);
router.post('/campaigns/:id/progress', charityController.addProgressUpdate);
router.get('/campaigns/:id/stats', charityController.getCampaignStats);

/* -------- Financial reports -------- */
router.post('/financial-reports', charityController.createFinancialReport);
router.get('/financial-reports', charityController.getMyFinancialReports);
router.get('/financial-reports/:id', charityController.getMyFinancialReportById);
router.put('/financial-reports/:id', charityController.updateMyFinancialReport);
router.delete('/financial-reports/:id', charityController.deleteMyFinancialReport);
router.post('/financial-reports/generate', charityController.generateAutoReport);
router.post('/financial-reports/:id/submit', charityController.submitFinancialReport);
router.get('/financial-overview', charityController.getFinancialOverview);

/* -------- Document upload -------- */
router.post(
  '/upload-document',
  uploadDocument,
  handleMulterError,
  charityController.uploadDocument
);

/* -------- Charity management -------- */
router.post(
  '/register',
  uploadCharityRegistration,
  handleMulterError,
  charityController.registerCharity
);

router.get('/my-charity', charityController.getMyCharity);
router.put('/my-charity', charityController.updateMyCharity);
router.get('/stats', charityController.getCharityStats);

/* ===================== Admin: duyệt/từ chối ===================== */
router.put('/:id/status', charityController.updateCharityStatus);

/* ===================== Get by ID (đặt CUỐI) ===================== */
router.get('/:id', charityController.getCharityById);

module.exports = router;
