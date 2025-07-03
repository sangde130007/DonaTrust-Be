const express = require('express');
const router = express.Router();
const charityController = require('../controllers/charityController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, charityController.create);
router.get('/', authMiddleware, charityController.getAll);
router.get('/:id', authMiddleware, charityController.getById);
router.put('/:id', authMiddleware, charityController.update);
router.delete('/:id', authMiddleware, charityController.delete);

module.exports = router;