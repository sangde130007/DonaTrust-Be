// src/routes/campaigns.js
const express = require('express');
const router = express.Router();

const { requireCharity, isCampaignOwner } = require('../middleware/roleMiddleware');
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/authMiddleware');

const {
  createCampaignUpload,
  handleMulterError,
  uploadCampaignSingleImage,
  uploadCampaignImages,
  uploadUpdateImages, // ✅ dùng uploader updates từ uploadMiddleware
} = require('../middleware/uploadMiddleware');

// Multer instance cho campaign (10MB/ảnh theo middleware)
const upload = createCampaignUpload();

/** Public routes */
router.get('/', campaignController.getAllCampaigns);
router.get('/featured', campaignController.getFeaturedCampaigns);
router.get('/categories', campaignController.getCategories);
router.get('/:id', campaignController.getCampaignById);

/** Create / Update / Delete */
router.post(
  '/',
  authMiddleware,
  requireCharity,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
    { name: 'qr_image', maxCount: 1 },
  ]),
  handleMulterError,
  campaignController.create
);

router.put('/:id', authMiddleware, campaignController.update);
router.delete('/:id', authMiddleware, campaignController.delete);

/** Upload routes */
router.post(
  '/:id/upload-image',
  authMiddleware,
  uploadCampaignSingleImage,
  handleMulterError,
  campaignController.uploadImage
);

router.post(
  '/:id/upload-images',
  authMiddleware,
  uploadCampaignImages,
  handleMulterError,
  campaignController.uploadImages
);

/** ===== Campaign Updates (Hoạt động) ===== */
// GET /api/campaigns/:id/updates
router.get('/:id/updates', campaignController.getCampaignUpdates);

// POST /api/campaigns/:id/updates (owner only, multipart images[])
router.post(
  '/:id/updates',
  authMiddleware,
  isCampaignOwner,
  uploadUpdateImages, // ✅ middleware nhận images[] (tối đa 10)
  handleMulterError,
  campaignController.createCampaignUpdate
);
// DELETE /api/campaigns/:id/updates/:updateId 
router.delete( 
  '/:id/updates/:updateId', 
  authMiddleware, 
isCampaignOwner, 
  campaignController.deleteCampaignUpdate 
);
module.exports = router;
