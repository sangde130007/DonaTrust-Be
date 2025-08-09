const express = require('express');
const router = express.Router();
const { requireCharity } = require('../middleware/roleMiddleware');

const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createCampaignUpload,
  handleMulterError,
  uploadCampaignSingleImage,
  uploadCampaignImages,
} = require('../middleware/uploadMiddleware');

// Multer instance cho campaign (10MB/ảnh theo middleware)
const upload = createCampaignUpload();

/**
 * Public routes
 */
router.get('/', campaignController.getAllCampaigns);
router.get('/featured', campaignController.getFeaturedCampaigns);
router.get('/categories', campaignController.getCategories);
router.get('/:id', campaignController.getCampaignById);

/**
 * Create / Update / Delete
 * - POST / : nhận body + file (image, images[], qr_image)
 */
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

/**
 * Upload routes (tách bước nếu cần)
 */
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

module.exports = router;
