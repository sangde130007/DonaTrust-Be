const { Op } = require('sequelize');
const { User, Charity, Campaign, News, Vote, Donation } = require('../models/associations');
const { AppError } = require('../utils/errorHandler');
const { ROLES, CAMPAIGN_APPROVAL_STATUS, CHARITY_VERIFICATION_STATUS, USER_STATUS } = require('../config/constants');

class AdminService {
	// ================================
	// CHARITY MANAGEMENT
	// ================================

	async getAllCharities(query) {
		const { page = 1, limit = 10, status, search } = query;
		const offset = (page - 1) * limit;

		const whereClause = {};
		if (status) {
			whereClause.verification_status = status;
		}
		if (search) {
			whereClause[Op.or] = [{ name: { [Op.iLike]: `%${search}%` } }, { tax_code: { [Op.iLike]: `%${search}%` } }];
		}

		const { count, rows } = await Charity.findAndCountAll({
			where: whereClause,
			include: [
				{
					model: User,
					as: 'user',
					attributes: ['user_id', 'full_name', 'email', 'phone', 'created_at'],
				},
			],
			limit: parseInt(limit),
			offset,
			order: [['created_at', 'DESC']],
		});

		return {
			charities: rows,
			pagination: {
				total: count,
				page: parseInt(page),
				limit: parseInt(limit),
				totalPages: Math.ceil(count / limit),
			},
		};
	}

	async getCharityById(charityId) {
		const charity = await Charity.findByPk(charityId, {
			include: [
				{
					model: User,
					as: 'user',
					attributes: ['user_id', 'full_name', 'email', 'phone', 'created_at'],
				},
				{
					model: Campaign,
					as: 'campaigns',
					attributes: ['campaign_id', 'title', 'status', 'approval_status', 'goal_amount', 'current_amount'],
				},
			],
		});

		if (!charity) {
			throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
		}

		return charity;
	}

	async verifyCharity(charityId, status, rejectionReason = null, adminId) {
		const charity = await Charity.findByPk(charityId);
		if (!charity) {
			throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
		}

		if (charity.verification_status !== CHARITY_VERIFICATION_STATUS.PENDING) {
			throw new AppError('Tổ chức từ thiện này đã được xử lý', 400);
		}

		charity.verification_status = status;
		charity.verified_at = status === CHARITY_VERIFICATION_STATUS.VERIFIED ? new Date() : null;
		charity.verified_by = status === CHARITY_VERIFICATION_STATUS.VERIFIED ? adminId : null;
		charity.rejection_reason = status === CHARITY_VERIFICATION_STATUS.REJECTED ? rejectionReason : null;

		await charity.save();

		return charity;
	}

	async getPendingCharities() {
		return await Charity.findAll({
			where: { verification_status: CHARITY_VERIFICATION_STATUS.PENDING },
			include: [
				{
					model: User,
					as: 'user',
					attributes: ['user_id', 'full_name', 'email', 'phone'],
				},
			],
			order: [['created_at', 'ASC']],
		});
	}

	// ================================
	// PROJECT APPROVAL
	// ================================

	async getAllCampaigns(query) {
		const { page = 1, limit = 10, approval_status, status, search } = query;
		const offset = (page - 1) * limit;

		const whereClause = {};
		if (approval_status) {
			whereClause.approval_status = approval_status;
		}
		if (status) {
			whereClause.status = status;
		}
		if (search) {
			whereClause.title = { [Op.iLike]: `%${search}%` };
		}

		const { count, rows } = await Campaign.findAndCountAll({
			where: whereClause,
			include: [
				{
					model: Charity,
					as: 'charity',
					attributes: ['charity_id', 'name', 'verification_status'],
					include: [
						{
							model: User,
							as: 'user',
							attributes: ['full_name', 'email'],
						},
					],
				},
			],
			limit: parseInt(limit),
			offset,
			order: [['created_at', 'DESC']],
		});

		return {
			campaigns: rows,
			pagination: {
				total: count,
				page: parseInt(page),
				limit: parseInt(limit),
				totalPages: Math.ceil(count / limit),
			},
		};
	}

	async getPendingCampaigns() {
		return await Campaign.findAll({
			where: {
				approval_status: 'pending',
				dao_approval_status: 'dao_approved' // ✅ Chỉ hiển thị campaigns đã pass DAO vote
			},
			include: [
				{
					model: Charity,
					as: 'charity',
					attributes: ['charity_id', 'name'],
					include: [
						{
							model: User,
							as: 'user',
							attributes: ['full_name', 'email'],
						},
					],
				},
			],
			order: [['dao_approved_at', 'ASC']], // Sắp xếp theo thời gian DAO approve
		});
	}

	async getCampaignById(campaignId) {
		const campaign = await Campaign.findByPk(campaignId, {
			include: [
				{
					model: Charity,
					as: 'charity',
					attributes: [
						'charity_id',
						'name',
						'verification_status',
						'logo_url',
						'phone',
						'email',
						'address',
						'city',
					],
					include: [
						{
							model: User,
							as: 'user',
							attributes: ['user_id', 'full_name', 'email', 'phone', 'created_at'],
						},
					],
				},
				{
					model: Donation,
					as: 'donations',
					attributes: this.getDonationAttributes(),
					include: [
						{
							model: User,
							as: 'user',
							attributes: ['full_name', 'email'],
						},
					],
					limit: 10,
					order: [['created_at', 'DESC']],
				},
			],
		});

		if (!campaign) {
			throw new AppError('Không tìm thấy chiến dịch', 404);
		}

		return campaign;
	}

	// Helper method to get donation attributes safely
	getDonationAttributes() {
		const baseAttributes = ['donation_id', 'amount', 'method', 'tx_code', 'is_anonymous', 'created_at'];

		// Check if message column exists in Donation model
		const donationAttributes = Object.keys(Donation.rawAttributes);
		if (donationAttributes.includes('message')) {
			return [...baseAttributes, 'message'];
		}

		return baseAttributes;
	}

	async approveCampaign(campaignId, adminId) {
		const campaign = await Campaign.findByPk(campaignId);
		if (!campaign) {
			throw new AppError('Không tìm thấy chiến dịch', 404);
		}

		if (campaign.approval_status !== CAMPAIGN_APPROVAL_STATUS.PENDING) {
			throw new AppError('Chiến dịch này đã được xử lý', 400);
		}

		campaign.approval_status = CAMPAIGN_APPROVAL_STATUS.APPROVED;
		campaign.approved_at = new Date();
		campaign.approved_by = adminId;
		campaign.status = 'active'; // Activate campaign when approved

		await campaign.save();

		return campaign;
	}

	async rejectCampaign(campaignId, rejectionReason, adminId) {
		const campaign = await Campaign.findByPk(campaignId);
		if (!campaign) {
			throw new AppError('Không tìm thấy chiến dịch', 404);
		}

		if (campaign.approval_status !== CAMPAIGN_APPROVAL_STATUS.PENDING) {
			throw new AppError('Chiến dịch này đã được xử lý', 400);
		}

		campaign.approval_status = CAMPAIGN_APPROVAL_STATUS.REJECTED;
		campaign.rejection_reason = rejectionReason;
		campaign.rejected_at = new Date();
		campaign.rejected_by = adminId;

		await campaign.save();

		return campaign;
	}

	// ================================
	// DAO MEMBER MANAGEMENT
	// ================================

	async getAllUsers(query) {
		const { page = 1, limit = 10, role, status, search } = query;
		const offset = (page - 1) * limit;

		const whereClause = {};
		if (role) {
			whereClause.role = role;
		}
		if (status) {
			whereClause.status = status;
		}
		if (search) {
			whereClause[Op.or] = [
				{ full_name: { [Op.iLike]: `%${search}%` } },
				{ email: { [Op.iLike]: `%${search}%` } },
			];
		}

		const { count, rows } = await User.findAndCountAll({
			where: whereClause,
			attributes: { exclude: ['password', 'password_reset_token', 'email_verification_token'] },
			limit: parseInt(limit),
			offset,
			order: [['created_at', 'DESC']],
		});

		return {
			users: rows,
			pagination: {
				total: count,
				page: parseInt(page),
				limit: parseInt(limit),
				totalPages: Math.ceil(count / limit),
			},
		};
	}

	async approveDAOMember(userId, adminId) {
		const user = await User.findByPk(userId);
		if (!user) {
			throw new AppError('Không tìm thấy người dùng', 404);
		}

		if (user.role !== ROLES.DONOR) {
			throw new AppError('Chỉ có thể phê duyệt thành viên DAO từ donor', 400);
		}

		user.role = ROLES.DAO_MEMBER;
		user.dao_approved_at = new Date();
		user.dao_approved_by = adminId;

		await user.save();

		return user;
	}

	async rejectDAOMember(userId, rejectionReason, adminId) {
		const user = await User.findByPk(userId);
		if (!user) {
			throw new AppError('Không tìm thấy người dùng', 404);
		}

		// Add rejection tracking (would need to add these fields to User model)
		user.dao_rejection_reason = rejectionReason;
		user.dao_rejected_at = new Date();
		user.dao_rejected_by = adminId;

		await user.save();

		return user;
	}

	async banUser(userId, reason, adminId) {
		const user = await User.findByPk(userId);
		if (!user) {
			throw new AppError('Không tìm thấy người dùng', 404);
		}

		if (user.role === ROLES.ADMIN) {
			throw new AppError('Không thể cấm admin', 400);
		}

		user.status = USER_STATUS.BANNED;
		user.ban_reason = reason;
		user.banned_at = new Date();
		user.banned_by = adminId;

		await user.save();

		return user;
	}

	async unbanUser(userId, adminId) {
		const user = await User.findByPk(userId);
		if (!user) {
			throw new AppError('Không tìm thấy người dùng', 404);
		}

		user.status = USER_STATUS.ACTIVE;
		user.ban_reason = null;
		user.banned_at = null;
		user.banned_by = null;
		user.unbanned_at = new Date();
		user.unbanned_by = adminId;

		await user.save();

		return user;
	}

	async updateUserRole(userId, newRole, adminId) {
		const allowedRoles = [ROLES.DONOR, ROLES.CHARITY, ROLES.DAO_MEMBER];
		if (!allowedRoles.includes(newRole)) {
			throw new AppError('Chỉ được đổi sang các role: donor, charity, dao_member', 400);
		}
		const user = await User.findByPk(userId);
		if (!user) {
			throw new AppError('Không tìm thấy người dùng', 404);
		}
		if (user.role === ROLES.ADMIN) {
			throw new AppError('Không thể đổi role của admin', 400);
		}
		user.role = newRole;
		await user.save();
		return user;
	}

	// ================================
	// VOTING MANAGEMENT
	// ================================

	async getAllVotes(query) {
		const { page = 1, limit = 10, campaign_id } = query;
		const offset = (page - 1) * limit;

		const whereClause = {};
		if (campaign_id) {
			whereClause.campaign_id = campaign_id;
		}

		const { count, rows } = await Vote.findAndCountAll({
			where: whereClause,
			include: [
				{
					model: User,
					as: 'user',
					attributes: ['user_id', 'full_name', 'role'],
				},
				{
					model: Campaign,
					as: 'campaign',
					attributes: ['campaign_id', 'title'],
				},
			],
			limit: parseInt(limit),
			offset,
			order: [['created_at', 'DESC']],
		});

		return {
			votes: rows,
			pagination: {
				total: count,
				page: parseInt(page),
				limit: parseInt(limit),
				totalPages: Math.ceil(count / limit),
			},
		};
	}

	async deleteVote(voteId, adminId) {
		const vote = await Vote.findByPk(voteId);
		if (!vote) {
			throw new AppError('Không tìm thấy vote', 404);
		}

		await vote.destroy();

		return { message: 'Vote đã được xóa thành công' };
	}

	// ================================
	// NEWS MANAGEMENT
	// ================================

	async createNews(newsData, adminId) {
		const news = await News.create({
			...newsData,
			author_id: adminId,
		});

		return news;
	}

	async getAllNews(query) {
		const { page = 1, limit = 10, status, category, search } = query;
		const offset = (page - 1) * limit;

		const whereClause = {};
		if (status) {
			whereClause.status = status;
		}
		if (category) {
			whereClause.category = category;
		}
		if (search) {
			whereClause[Op.or] = [{ title: { [Op.iLike]: `%${search}%` } }, { content: { [Op.iLike]: `%${search}%` } }];
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
			order: [['created_at', 'DESC']],
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

	async getNewsById(newsId) {
		const news = await News.findByPk(newsId, {
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

		return news;
	}

	async updateNews(newsId, updateData, adminId) {
		const news = await News.findByPk(newsId);
		if (!news) {
			throw new AppError('Không tìm thấy tin tức', 404);
		}

		// Only allow author or admin to update
		if (news.author_id !== adminId) {
			// Check if current user is admin (this check should be done in controller)
		}

		Object.assign(news, updateData);
		await news.save();

		return news;
	}

	async deleteNews(newsId, adminId) {
		const news = await News.findByPk(newsId);
		if (!news) {
			throw new AppError('Không tìm thấy tin tức', 404);
		}

		await news.destroy();

		return { message: 'Tin tức đã được xóa thành công' };
	}

	async publishNews(newsId, adminId) {
		const news = await News.findByPk(newsId);
		if (!news) {
			throw new AppError('Không tìm thấy tin tức', 404);
		}

		news.status = 'published';
		news.published_at = new Date();
		await news.save();

		return news;
	}

	// ================================
	// DASHBOARD STATS
	// ================================

	async getDashboardStats() {
		const [
			totalUsers,
			totalCharities,
			totalCampaigns,
			pendingCharities,
			pendingCampaigns,
			totalDonations,
			totalNews,
			totalDonationAmount,
		] = await Promise.all([
			User.count(),
			Charity.count(),
			Campaign.count(),
			Charity.count({ where: { verification_status: CHARITY_VERIFICATION_STATUS.PENDING } }),
			Campaign.count({ where: { approval_status: CAMPAIGN_APPROVAL_STATUS.PENDING } }),
			Donation.count(),
			News.count(),
			Donation.sum('amount'),
		]);

		return {
			totalUsers,
			totalCharities,
			totalCampaigns,
			pendingCharities,
			pendingCampaigns,
			totalDonations,
			totalNews,
			totalDonationAmount: totalDonationAmount || 0,
			pendingApprovals: pendingCharities + pendingCampaigns,
		};
	}

	/**
 * Lấy campaigns đã được DAO approve
 */
	async getDAOApprovedCampaigns() {
		return await Campaign.findAll({
			where: {
				dao_approval_status: 'dao_approved',
				approval_status: 'pending'
			},
			include: [
				{
					model: Charity,
					as: 'charity',
					attributes: ['charity_id', 'name'],
				}
			],
			order: [['dao_approved_at', 'ASC']],
		});
	}

	/**
 * Admin phê duyệt campaign đã được DAO approve
 */
	async approveDAOApprovedCampaign(campaignId, adminId) {
		const campaign = await Campaign.findOne({
			where: {
				campaign_id: campaignId,
				dao_approval_status: 'dao_approved',
				approval_status: 'pending'
			}
		});

		if (!campaign) {
			throw new AppError('Không tìm thấy chiến dịch hoặc chưa được DAO phê duyệt', 404);
		}

		await campaign.update({
			approval_status: 'approved',
			approved_at: new Date(),
			approved_by: adminId,
			status: 'active'
		});

		return campaign;
	}
}

module.exports = new AdminService();
