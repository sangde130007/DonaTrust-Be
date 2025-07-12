const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadCampaignSingleImage, uploadCampaignImages } = require('../middleware/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   name: Campaigns
 *   description: API quản lý chiến dịch (public)
 */

// Public routes
router.get('/', campaignController.getAllCampaigns);
router.get('/featured', campaignController.getFeaturedCampaigns);
router.get('/categories', campaignController.getCategories);
router.get('/:id', campaignController.getCampaignById);

router.post('/', authMiddleware, campaignController.create);
router.put('/:id', authMiddleware, campaignController.update);
router.delete('/:id', authMiddleware, campaignController.delete);

// Upload routes for campaigns
router.post('/:id/upload-image', authMiddleware, uploadCampaignSingleImage, campaignController.uploadImage);
router.post('/:id/upload-images', authMiddleware, uploadCampaignImages, campaignController.uploadImages);

module.exports = router;
