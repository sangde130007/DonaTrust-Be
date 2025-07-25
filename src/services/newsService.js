const { Op } = require('sequelize');
const { News, User } = require('../models/associations');
const { AppError } = require('../utils/errorHandler');

class NewsService {
	async getPublishedNews(query) {
		const { page = 1, limit = 10, category, search, priority } = query;
		const offset = (page - 1) * limit;

		const whereClause = {
			status: 'published',
			[Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
		};

		if (category) {
			whereClause.category = category;
		}
		if (priority) {
			whereClause.priority = priority;
		}
		if (search) {
			whereClause[Op.or] = [{ title: { [Op.iLike]: `%${search}%` } }, { summary: { [Op.iLike]: `%${search}%` } }];
		}

		const { count, rows } = await News.findAndCountAll({
			where: whereClause,
			include: [
				{
					model: User,
					as: 'author',
					attributes: ['user_id', 'full_name'],
				},
			],
			limit: parseInt(limit),
			offset,
			order: [
				['priority', 'DESC'],
				['published_at', 'DESC'],
			],
		});

		return {
			news: rows,
			pagination: {
				total: count,
				page: parseInt(page),
				limit: parseInt(limit),
				totalPages: Math.ceil(count / limit),
			},
		};
	}

	async getFeaturedNews() {
		return await News.findAll({
			where: {
				status: 'published',
				featured: true,
				[Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
			},
			include: [
				{
					model: User,
					as: 'author',
					attributes: ['user_id', 'full_name'],
				},
			],
			limit: 5,
			order: [
				['priority', 'DESC'],
				['published_at', 'DESC'],
			],
		});
	}

	async getNewsById(newsId) {
		const news = await News.findOne({
			where: {
				news_id: newsId,
				status: 'published',
			},
			include: [
				{
					model: User,
					as: 'author',
					attributes: ['user_id', 'full_name'],
				},
			],
		});

		if (!news) {
			throw new AppError('Không tìm thấy tin tức', 404);
		}

		// Check if news is expired
		if (news.expires_at && new Date() > news.expires_at) {
			throw new AppError('Tin tức đã hết hạn', 404);
		}

		return news;
	}

	async incrementNewsViews(newsId) {
		const news = await News.findOne({
			where: {
				news_id: newsId,
				status: 'published',
			},
		});

		if (!news) {
			throw new AppError('Không tìm thấy tin tức', 404);
		}

		// Check if news is expired
		if (news.expires_at && new Date() > news.expires_at) {
			throw new AppError('Tin tức đã hết hạn', 404);
		}

		news.views += 1;
		await news.save();

		return { message: 'Đã cập nhật lượt xem', views: news.views };
	}

	async getNewsCategories() {
		return [
			{ value: 'announcement', label: 'Thông báo' },
			{ value: 'update', label: 'Cập nhật' },
			{ value: 'campaign', label: 'Chiến dịch' },
			{ value: 'charity', label: 'Tổ chức từ thiện' },
			{ value: 'system', label: 'Hệ thống' },
		];
	}
}

module.exports = new NewsService();
