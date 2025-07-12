const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: API quản lý xác thực người dùng
 */

// Public routes
router.post('/register', authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.use(authMiddleware); // Áp dụng middleware cho các routes bên dưới

router.post('/send-phone-verification', authController.sendPhoneVerification);
router.post('/verify-phone', authController.verifyPhone);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
