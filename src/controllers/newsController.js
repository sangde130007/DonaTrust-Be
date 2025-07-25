const newsService = require('../services/newsService');

/**
 * @swagger
 * tags:
 *   name: News
 *   description: API tin tức công khai
 */

class NewsController {
	/**
	 * @swagger
	 * /api/news:
	 *   get:
	 *     summary: Lấy danh sách tin tức đã xuất bản
	 *     tags: [News]
	 *     parameters:
	 *       - in: query
	 *         name: page
	 *         schema:
	 *           type: integer
	 *         description: Số trang
	 *       - in: query
	 *         name: limit
	 *         schema:
	 *           type: integer
	 *         description: Số lượng mỗi trang
	 *       - in: query
	 *         name: category
	 *         schema:
	 *           type: string
	 *         description: Danh mục tin tức
	 *       - in: query
	 *         name: search
	 *         schema:
	 *           type: string
	 *         description: Tìm kiếm theo tiêu đề
	 */
	getPublishedNews = async (req, res, next) => {
		try {
			const result = await newsService.getPublishedNews(req.query);
			res.json(result);
		} catch (error) {
			next(error);
		}
	};

	/**
	 * @swagger
	 * /api/news/featured:
	 *   get:
	 *     summary: Lấy tin tức nổi bật
	 *     tags: [News]
	 */
	getFeaturedNews = async (req, res, next) => {
		try {
			const news = await newsService.getFeaturedNews();
			res.json(news);
		} catch (error) {
			next(error);
		}
	};

	/**
	 * @swagger
	 * /api/news/categories:
	 *   get:
	 *     summary: Lấy danh sách danh mục tin tức
	 *     tags: [News]
	 */
	getNewsCategories = async (req, res, next) => {
		try {
			const categories = await newsService.getNewsCategories();
			res.json(categories);
		} catch (error) {
			next(error);
		}
	};

	/**
	 * @swagger
	 * /api/news/{id}:
	 *   get:
	 *     summary: Lấy chi tiết tin tức
	 *     tags: [News]
	 *     parameters:
	 *       - in: path
	 *         name: id
	 *         required: true
	 *         schema:
	 *           type: string
	 *         description: ID tin tức
	 */
	getNewsById = async (req, res, next) => {
		try {
			const news = await newsService.getNewsById(req.params.id);
			res.json(news);
		} catch (error) {
			next(error);
		}
	};

	/**
	 * @swagger
	 * /api/news/{id}/view:
	 *   put:
	 *     summary: Tăng lượt xem tin tức
	 *     tags: [News]
	 *     parameters:
	 *       - in: path
	 *         name: id
	 *         required: true
	 *         schema:
	 *           type: string
	 *         description: ID tin tức
	 */
	incrementNewsViews = async (req, res, next) => {
		try {
			const result = await newsService.incrementNewsViews(req.params.id);
			res.json(result);
		} catch (error) {
			next(error);
		}
	};
}

module.exports = new NewsController();
