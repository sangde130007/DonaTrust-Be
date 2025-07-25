const FinancialReport = require('../models/FinancialReport');
const Charity = require('../models/Charity');
const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');
const { AppError } = require('../utils/errorHandler');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Tạo báo cáo tài chính
 */
exports.createFinancialReport = async (userId, reportData) => {
	const charity = await Charity.findOne({ where: { user_id: userId } });

	if (!charity) {
		throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
	}

	// Validate dates
	const startDate = new Date(reportData.period_start);
	const endDate = new Date(reportData.period_end);

	if (endDate <= startDate) {
		throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', 400);
	}

	// Kiểm tra campaign nếu là campaign report
	if (reportData.report_type === 'campaign' && reportData.campaign_id) {
		const campaign = await Campaign.findOne({
			where: {
				campaign_id: reportData.campaign_id,
				charity_id: charity.charity_id,
			},
		});

		if (!campaign) {
			throw new AppError('Không tìm thấy chiến dịch', 404);
		}
	}

	const report = await FinancialReport.create({
		...reportData,
		charity_id: charity.charity_id,
	});

	logger.info(`Financial report created: ${report.report_type} by charity ${charity.name}`);
	return report;
};

/**
 * Lấy tất cả báo cáo tài chính của charity
 */
exports.getMyFinancialReports = async (userId, filters = {}) => {
	const charity = await Charity.findOne({ where: { user_id: userId } });

	if (!charity) {
		throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
	}

	const { page = 1, limit = 10, report_type, status, year, sort = 'created_at', order = 'DESC' } = filters;

	const offset = (page - 1) * limit;
	const whereClause = { charity_id: charity.charity_id };

	if (report_type) {
		whereClause.report_type = report_type;
	}

	if (status) {
		whereClause.status = status;
	}

	if (year) {
		whereClause.period_start = {
			[Op.gte]: new Date(`${year}-01-01`),
			[Op.lt]: new Date(`${parseInt(year) + 1}-01-01`),
		};
	}

	const reports = await FinancialReport.findAndCountAll({
		where: whereClause,
		include: [
			{
				model: Campaign,
				as: 'campaign',
				attributes: ['title'],
				required: false,
			},
		],
		limit: parseInt(limit),
		offset: parseInt(offset),
		order: [[sort, order.toUpperCase()]],
	});

	return {
		reports: reports.rows,
		total: reports.count,
		page: parseInt(page),
		limit: parseInt(limit),
		totalPages: Math.ceil(reports.count / limit),
	};
};

/**
 * Lấy báo cáo tài chính theo ID
 */
exports.getMyFinancialReportById = async (userId, reportId) => {
	const charity = await Charity.findOne({ where: { user_id: userId } });

	if (!charity) {
		throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
	}

	const report = await FinancialReport.findOne({
		where: {
			report_id: reportId,
			charity_id: charity.charity_id,
		},
		include: [
			{
				model: Campaign,
				as: 'campaign',
				attributes: ['title', 'goal_amount', 'current_amount'],
				required: false,
			},
		],
	});

	if (!report) {
		throw new AppError('Không tìm thấy báo cáo tài chính', 404);
	}

	return report;
};

/**
 * Cập nhật báo cáo tài chính
 */
exports.updateMyFinancialReport = async (userId, reportId, updateData) => {
	const charity = await Charity.findOne({ where: { user_id: userId } });

	if (!charity) {
		throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
	}

	const report = await FinancialReport.findOne({
		where: {
			report_id: reportId,
			charity_id: charity.charity_id,
		},
	});

	if (!report) {
		throw new AppError('Không tìm thấy báo cáo tài chính', 404);
	}

	// Không cho phép sửa báo cáo đã published
	if (report.status === 'published') {
		throw new AppError('Không thể sửa báo cáo đã được công bố', 400);
	}

	await report.update(updateData);

	logger.info(`Financial report updated: ${report.report_type} by charity ${charity.name}`);
	return report;
};

/**
 * Xóa báo cáo tài chính
 */
exports.deleteMyFinancialReport = async (userId, reportId) => {
	const charity = await Charity.findOne({ where: { user_id: userId } });

	if (!charity) {
		throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
	}

	const report = await FinancialReport.findOne({
		where: {
			report_id: reportId,
			charity_id: charity.charity_id,
		},
	});

	if (!report) {
		throw new AppError('Không tìm thấy báo cáo tài chính', 404);
	}

	// Không cho phép xóa báo cáo đã published
	if (report.status === 'published') {
		throw new AppError('Không thể xóa báo cáo đã được công bố', 400);
	}

	await report.destroy();

	logger.info(`Financial report deleted: ${report.report_type} by charity ${charity.name}`);
	return { message: 'Đã xóa báo cáo tài chính thành công' };
};

/**
 * Tự động tạo báo cáo từ dữ liệu
 */
exports.generateAutoReport = async (userId, reportType, periodStart, periodEnd, campaignId = null) => {
	const charity = await Charity.findOne({ where: { user_id: userId } });

	if (!charity) {
		throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
	}

	// Validate dates
	const startDate = new Date(periodStart);
	const endDate = new Date(periodEnd);

	if (endDate <= startDate) {
		throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', 400);
	}

	// Kiểm tra campaign nếu là campaign report
	if (reportType === 'campaign' && campaignId) {
		const campaign = await Campaign.findOne({
			where: {
				campaign_id: campaignId,
				charity_id: charity.charity_id,
			},
		});

		if (!campaign) {
			throw new AppError('Không tìm thấy chiến dịch', 404);
		}
	}

	const report = await FinancialReport.create({
		report_type,
		period_start: startDate.toISOString().split('T')[0],
		period_end: endDate.toISOString().split('T')[0],
		charity_id: charity.charity_id,
	});

	logger.info(`Financial report created: ${report.report_type} by charity ${charity.name}`);
	return report;
};

/**
 * Submit báo cáo để duyệt
 */
exports.submitFinancialReport = async (userId, reportId) => {
	const charity = await Charity.findOne({ where: { user_id: userId } });

	if (!charity) {
		throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
	}

	const report = await FinancialReport.findOne({
		where: {
			report_id: reportId,
			charity_id: charity.charity_id,
		},
	});

	if (!report) {
		throw new AppError('Không tìm thấy báo cáo tài chính', 404);
	}

	if (report.status !== 'draft') {
		throw new AppError('Chỉ có thể submit báo cáo ở trạng thái draft', 400);
	}

	await report.update({ status: 'submitted' });

	logger.info(`Financial report submitted: ${report.report_type} by charity ${charity.name}`);
	return report;
};

/**
 * Lấy thống kê tài chính tổng quan
 */
exports.getFinancialOverview = async (userId, year = null) => {
	const charity = await Charity.findOne({ where: { user_id: userId } });

	if (!charity) {
		throw new AppError('Bạn chưa đăng ký tổ chức từ thiện', 404);
	}

	const currentYear = year || new Date().getFullYear();
	const startDate = new Date(`${currentYear}-01-01`);
	const endDate = new Date(`${currentYear}-12-31`);

	// Lấy tất cả campaigns của charity
	const campaigns = await Campaign.findAll({
		where: { charity_id: charity.charity_id },
		attributes: ['campaign_id', 'title', 'current_amount', 'goal_amount'],
	});

	const campaignIds = campaigns.map((c) => c.campaign_id);

	// Lấy donations trong năm
	const donations = await Donation.findAll({
		where: {
			campaign_id: campaignIds,
			created_at: {
				[Op.gte]: startDate,
				[Op.lte]: endDate,
			},
		},
	});

	// Lấy báo cáo tài chính trong năm
	const reports = await FinancialReport.findAll({
		where: {
			charity_id: charity.charity_id,
			period_start: {
				[Op.gte]: startDate,
			},
			period_end: {
				[Op.lte]: endDate,
			},
		},
	});

	// Tính toán thống kê
	const totalIncome = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
	const totalExpenses = reports.reduce((sum, r) => sum + parseFloat(r.total_expenses || 0), 0);

	// Thống kê theo tháng
	const monthlyStats = [];
	for (let month = 1; month <= 12; month++) {
		const monthStart = new Date(currentYear, month - 1, 1);
		const monthEnd = new Date(currentYear, month, 0);

		const monthDonations = donations.filter((d) => {
			const donationDate = new Date(d.created_at);
			return donationDate >= monthStart && donationDate <= monthEnd;
		});

		const monthIncome = monthDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0);

		monthlyStats.push({
			month,
			income: monthIncome,
			donations_count: monthDonations.length,
		});
	}

	return {
		year: currentYear,
		total_income: totalIncome,
		total_expenses: totalExpenses,
		net_amount: totalIncome - totalExpenses,
		total_donations: donations.length,
		active_campaigns: campaigns.filter((c) => parseFloat(c.current_amount) < parseFloat(c.goal_amount)).length,
		completed_campaigns: campaigns.filter((c) => parseFloat(c.current_amount) >= parseFloat(c.goal_amount)).length,
		monthly_breakdown: monthlyStats,
		recent_reports: reports.slice(-5),
	};
};
