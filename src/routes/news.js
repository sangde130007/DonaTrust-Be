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

// Đếm lượt xem (giữ PUT để tương thích cũ, thêm POST cho hợp lý semantics)
router.post('/:id/view', newsController.incrementNewsViews);
router.put('/:id/view', newsController.incrementNewsViews); // backward compatible

module.exports = router;
