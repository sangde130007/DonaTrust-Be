const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, notificationController.create);
router.get('/', authMiddleware, notificationController.getAll);
router.get('/:id', authMiddleware, notificationController.getById);
router.put('/:id', authMiddleware, notificationController.update);
router.delete('/:id', authMiddleware, notificationController.delete);

module.exports = router;