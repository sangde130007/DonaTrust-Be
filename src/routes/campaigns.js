// src/routes/campaigns.js
const express = require('express');
const router = express.Router();

const { requireCharity, isCampaignOwner } = require('../middleware/roleMiddleware');
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/authMiddleware');
const reportController = require('../controllers/reportCampaignController');

const {
  handleMulterError,
  uploadCampaignSingleImage,
  uploadCampaignImages,
  uploadUpdateImages, // ✅ dùng uploader updates từ uploadMiddleware
  uploadQrImage,
} = require('../middleware/uploadMiddleware');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');

/** Public routes */
router.get('/', campaignController.getAllCampaigns);
router.get('/featured', campaignController.getFeaturedCampaigns);
router.get('/categories', campaignController.getCategories);
router.get('/:id', campaignController.getCampaignById);

// Create campaign upload middleware that handles multiple fields
const uploadCampaignCreation = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'donatrust/campaigns',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
        { quality: 'auto' }
      ],
      public_id: (req, file) => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        return `campaign_${file.fieldname}_${timestamp}_${randomString}`;
      }
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  { name: 'qr_image', maxCount: 1 },
]);

/** Create / Update / Delete */
router.post(
  '/',
  authMiddleware,
  requireCharity,
  uploadCampaignCreation, // Use Cloudinary for multiple fields
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

router.post('/:campaignId/report', authMiddleware, (req, res, next) => {
  const middlewares = reportController.createReport;
  let index = 0;
  
  const runNext = (err) => {
    if (err) return next(err);
    if (index >= middlewares.length) return;
    
    const middleware = middlewares[index++];
    middleware(req, res, runNext);
  };
  
  runNext();
});


module.exports = router;
