const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Tất cả route admin yêu cầu đăng nhập + quyền admin
router.use(authMiddleware);
router.use(requireAdmin);

/* ====== Reported Campaigns (NEW) ====== */
// -> /api/admin/report-campaigns/*
router.use('/report-campaigns', require('./reportRoutes'));

/* ====== Dashboard ====== */
router.get('/dashboard/stats', adminController.getDashboardStats);

/* ====== Charities ====== */
router.get('/charities', adminController.getAllCharities);
router.get('/charities/pending', adminController.getPendingCharities);
router.get('/charities/:id', adminController.getCharityById);
router.put('/charities/:id/verify', adminController.verifyCharity);

/* ====== Campaigns ====== */
router.get('/campaigns', adminController.getAllCampaigns);
router.get('/campaigns/pending', adminController.getPendingCampaigns);
router.get('/campaigns/:id', adminController.getCampaignById);
router.put('/campaigns/:id/approve', adminController.approveCampaign);
router.put('/campaigns/:id/reject', adminController.rejectCampaign);

/* ====== Users / DAO ====== */
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/approve-dao', adminController.approveDAOMember);
router.put('/users/:id/reject-dao', adminController.rejectDAOMember);
router.put('/users/:id/ban', adminController.banUser);
router.put('/users/:id/unban', adminController.unbanUser);
router.put('/users/:id/role', adminController.updateUserRole);

/* ====== Votes ====== */
router.get('/votes', adminController.getAllVotes);
router.delete('/votes/:id', adminController.deleteVote);

/* ====== News ====== */
router.post('/news', adminController.createNews);
router.get('/news', adminController.getAllNews);
router.get('/news/:id', adminController.getNewsById);
router.put('/news/:id', adminController.updateNews);
router.delete('/news/:id', adminController.deleteNews);
router.put('/news/:id/publish', adminController.publishNews);

module.exports = router;
