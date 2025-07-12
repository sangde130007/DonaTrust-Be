const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

/**
 * @swagger
 * tags:
 *   name: News
 *   description: API tin tức công khai
 */

// Public routes - no authentication required
router.get('/', newsController.getPublishedNews);
router.get('/featured', newsController.getFeaturedNews);
router.get('/categories', newsController.getNewsCategories);
router.get('/:id', newsController.getNewsById);
router.put('/:id/view', newsController.incrementNewsViews);

module.exports = router;
