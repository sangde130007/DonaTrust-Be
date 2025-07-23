const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   name: User Management
 *   description: API quản lý hồ sơ người dùng
 */

// Apply auth middleware to all routes first
router.use(authMiddleware);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);

// Upload routes
router.post('/upload-avatar', uploadAvatar, userController.uploadAvatar);

// Account management
router.put('/deactivate', userController.deactivateAccount);

module.exports = router;
