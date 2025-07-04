const express = require('express');
const router = express.Router();
const userSocialLinkController = require('../controllers/userSocialLinkController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, userSocialLinkController.create);
router.get('/', authMiddleware, userSocialLinkController.getAll);
router.get('/:id', authMiddleware, userSocialLinkController.getById);
router.put('/:id', authMiddleware, userSocialLinkController.update);
router.delete('/:id', authMiddleware, userSocialLinkController.delete);

module.exports = router;