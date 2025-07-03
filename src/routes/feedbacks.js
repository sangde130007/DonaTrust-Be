const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, feedbackController.create);
router.get('/', authMiddleware, feedbackController.getAll);
router.get('/:id', authMiddleware, feedbackController.getById);
router.put('/:id', authMiddleware, feedbackController.update);
router.delete('/:id', authMiddleware, feedbackController.delete);

module.exports = router;