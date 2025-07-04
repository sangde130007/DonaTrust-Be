const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, donationController.create);
router.get('/', authMiddleware, donationController.getAll);
router.get('/:id', authMiddleware, donationController.getById);
router.put('/:id', authMiddleware, donationController.update);
router.delete('/:id', authMiddleware, donationController.delete);

module.exports = router;