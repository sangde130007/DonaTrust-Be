// src/routes/notifications.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/authMiddleware');

// User routes
router.get('/notifications/mine', auth, notificationController.getMine);
router.get('/notifications/unread-count', auth, notificationController.getUnreadCount);
router.get('/notifications/mine/:id', auth, notificationController.getMineById);
router.put('/notifications/:id/read', auth, notificationController.markAsRead);
router.put('/notifications/read-all', auth, notificationController.markAllAsRead);
router.delete('/notifications/mine/:id', auth, notificationController.deleteMine);
router.put('/notifications/mine/:id', auth, notificationController.updateMine);

// Admin routes
router.post('/notifications', auth, notificationController.create);
router.get('/notifications', auth, notificationController.getAll);
router.get('/notifications/:id', auth, notificationController.getById);
router.put('/notifications/:id', auth, notificationController.update);
router.delete('/notifications/:id', auth, notificationController.delete);

module.exports = router;
