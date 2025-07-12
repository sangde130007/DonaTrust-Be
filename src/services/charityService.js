const Charity = require('../models/Charity');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const FinancialReport = require('../models/FinancialReport');
const { AppError } = require('../utils/errorHandler');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

exports.create = async (data) => {
	const charity = await Charity.create(data);
	return charity;
};

exports.getAll = async () => {
	return await Charity.findAll();
};

exports.getById = async (id) => {
	const charity = await Charity.findByPk(id);
	if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
	return charity;
};

exports.update = async (id, data) => {
	const charity = await Charity.findByPk(id);
	if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
	await charity.update(data);
	return charity;
};

exports.delete = async (id) => {
	const charity = await Charity.findByPk(id);
	if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
	await charity.destroy();
};

/**
 * Đăng ký tổ chức từ thiện
 */
exports.registerCharity = async (userId, charityData) => {
	// Kiểm tra user tồn tại và có role charity
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	if (user.role !== 'charity') {
		throw new AppError('Chỉ tài khoản có role charity mới có thể đăng ký tổ chức từ thiện', 403);
	}

	// Kiểm tra đã đăng ký chưa
	const existingCharity = await Charity.findOne({ where: { user_id: userId } });
	if (existingCharity) {
		throw new AppError('Tài khoản này đã đăng ký tổ chức từ thiện', 400);
	}

	// Kiểm tra license_number unique
	if (charityData.license_number) {
		const existingLicense = await Charity.findOne({
			where: { license_number: charityData.license_number },
		});
		if (existingLicense) {
			throw new AppError('Số giấy phép này đã được sử dụng', 400);
		}
	}

	const charity = await Charity.create({
		user_id: userId,
		...charityData,
	});

	logger.info(`Charity registered: ${charity.name} by user ${userId}`);
	return charity;
};

/**
 * Lấy thông tin charity của user hiện tại
 */
exports.getMyCharity = async (userId) => {
	const charity = await Charity.findOne({
		where: { user_id: userId },
		include: [
			{
				model: User,
				as: 'user',
				attributes: ['user_id', 'full_name', 'email', 'phone'],
			},
		],
	});

	if (!charity) {
		throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
	}

	return charity;
};

/**
 * Cập nhật thông tin charity
 */
exports.updateMyCharity = async (userId, updateData) => {
	const charity = await Charity.findOne({ where: { user_id: userId } });

	if (!charity) {
		throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
	}

	// Kiểm tra license_number unique nếu có thay đổi
	if (updateData.license_number && updateData.license_number !== charity.license_number) {
		const existingLicense = await Charity.findOne({
			where: {
				license_number: updateData.license_number,
				charity_id: { [Op.ne]: charity.charity_id },
			},
		});
		if (existingLicense) {
			throw new AppError('Số giấy phép này đã được sử dụng', 400);
		}
	}

	await charity.update(updateData);

	logger.info(`Charity updated: ${charity.name} by user ${userId}`);
	return charity;
};

/**
 * Lấy tất cả charity (public)
 */
exports.getAllCharities = async (filters = {}) => {
	const {
		page = 1,
		limit = 10,
		search,
		verification_status = 'verified',
		city,
		category,
		sort = 'created_at',
		order = 'DESC',
	} = filters;

	const offset = (page - 1) * limit;
	const whereClause = { verification_status };

	if (search) {
		whereClause[Op.or] = [
			{ name: { [Op.iLike]: `%${search}%` } },
			{ description: { [Op.iLike]: `%${search}%` } },
			{ mission: { [Op.iLike]: `%${search}%` } },
		];
	}

	if (city) {
		whereClause.city = city;
	}

	const charities = await Charity.findAndCountAll({
		where: whereClause,
		include: [
			{
				model: User,
				as: 'user',
				attributes: ['full_name'],
			},
		],
		attributes: { exclude: ['bank_account', 'verification_documents'] },
		limit: parseInt(limit),
		offset: parseInt(offset),
		order: [[sort, order.toUpperCase()]],
	});

	return {
		charities: charities.rows,
		total: charities.count,
		page: parseInt(page),
		limit: parseInt(limit),
		totalPages: Math.ceil(charities.count / limit),
	};
};

/**
 * Lấy charity theo ID (public)
 */
exports.getCharityById = async (charityId) => {
	const charity = await Charity.findByPk(charityId, {
		include: [
			{
				model: User,
				as: 'user',
				attributes: ['user_id', 'full_name', 'email', 'phone'],
			},
			{
				model: Campaign,
				as: 'campaigns',
				where: { status: 'active' },
				required: false,
				attributes: ['campaign_id', 'title', 'goal_amount', 'current_amount', 'end_date'],
			},
		],
		attributes: { exclude: ['bank_account'] },
	});

	if (!charity) {
		throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
	}

	return charity;
};

/**
 * Xóa charity (chỉ admin hoặc chính charity đó)
 */
exports.deleteCharity = async (charityId, userId, userRole) => {
	const charity = await Charity.findByPk(charityId);

	if (!charity) {
		throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
	}

	// Kiểm tra quyền
	if (userRole !== 'admin' && charity.user_id !== userId) {
		throw new AppError('Bạn không có quyền xóa tổ chức từ thiện này', 403);
	}

	// Kiểm tra có campaign đang active không
	const activeCampaigns = await Campaign.count({
		where: {
			charity_id: charityId,
		},
	});

	if (activeCampaigns > 0) {
		throw new AppError('Không thể xóa tổ chức từ thiện có campaign đang active', 400);
	}

	await charity.destroy();
};

/**
 * Upload tài liệu cho charity
 */
exports.uploadDocument = async (userId, file, documentData) => {
	if (!file) {
		throw new AppError('Không có file được upload', 400);
	}

	// Tìm charity của user
	const charity = await Charity.findOne({ where: { user_id: userId } });
	if (!charity) {
		throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
	}

	// Tạo URL cho document
	const documentUrl = `/uploads/documents/${file.filename}`;

	// Lấy documents hiện tại và thêm document mới
	const currentDocuments = charity.verification_documents || [];
	const newDocument = {
		id: Date.now().toString(),
		filename: file.filename,
		url: documentUrl,
		type: documentData.document_type || 'other',
		description: documentData.description || '',
		uploaded_at: new Date().toISOString(),
		size: file.size,
		mimetype: file.mimetype,
	};

	const updatedDocuments = [...currentDocuments, newDocument];

	// Cập nhật charity với document mới
	await charity.update({
		verification_documents: updatedDocuments,
		// Nếu là license document, cập nhật license_document field
		...(documentData.document_type === 'license' && { license_document: documentUrl }),
	});

	logger.info(`Document uploaded for charity: ${charity.name}, file: ${file.filename}`);
	return {
		message: 'Upload tài liệu thành công',
		document_url: documentUrl,
		document_info: newDocument,
		charity: charity,
	};
};

/**
 * Lấy thống kê charity
 */
exports.getCharityStats = async (userId) => {
	const charity = await Charity.findOne({ where: { user_id: userId } });
	if (!charity) {
		throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
	}

	// Thống kê campaigns
	const campaignStats = await Campaign.findAll({
		where: { charity_id: charity.charity_id },
		attributes: [
			[require('sequelize').fn('COUNT', require('sequelize').col('campaign_id')), 'total_campaigns'],
			[require('sequelize').fn('SUM', require('sequelize').col('current_amount')), 'total_raised'],
			[require('sequelize').fn('AVG', require('sequelize').col('current_amount')), 'avg_raised_per_campaign'],
		],
		raw: true,
	});

	// Thống kê theo status
	const statusStats = await Campaign.findAll({
		where: { charity_id: charity.charity_id },
		attributes: ['status', [require('sequelize').fn('COUNT', require('sequelize').col('campaign_id')), 'count']],
		group: ['status'],
		raw: true,
	});

	// Financial reports
	const reportStats = await FinancialReport.findAll({
		where: { charity_id: charity.charity_id },
		attributes: [[require('sequelize').fn('COUNT', require('sequelize').col('report_id')), 'total_reports']],
		raw: true,
	});

	return {
		charity_info: {
			name: charity.name,
			verification_status: charity.verification_status,
			rating: charity.rating,
			active_campaigns: charity.active_campaigns,
		},
		campaign_stats: {
			total_campaigns: parseInt(campaignStats[0]?.total_campaigns) || 0,
			total_raised: parseFloat(campaignStats[0]?.total_raised) || 0,
			avg_raised_per_campaign: parseFloat(campaignStats[0]?.avg_raised_per_campaign) || 0,
			by_status: statusStats,
		},
		financial_stats: {
			total_reports: parseInt(reportStats[0]?.total_reports) || 0,
		},
	};
};
