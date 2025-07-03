const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, voteController.create);
router.get('/', authMiddleware, voteController.getAll);
router.get('/:id', authMiddleware, voteController.getById);
router.put('/:id', authMiddleware, voteController.update);
router.delete('/:id', authMiddleware, voteController.delete);

module.exports = router;