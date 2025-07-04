const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, campaignController.create);
router.get('/', campaignController.getAll);
router.get('/:id', campaignController.getById);
router.put('/:id', authMiddleware, campaignController.update);
router.delete('/:id', authMiddleware, campaignController.delete);

module.exports = router;