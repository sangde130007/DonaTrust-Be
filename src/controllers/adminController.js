const { check } = require('express-validator');
const adminService = require('../services/adminService');
const validate = require('../middleware/validationMiddleware');

/**
 * @swagger
 * tags:
 *   name: Admin Management
 *   description: API quản lý hệ thống dành cho admin
 */

class AdminController {
	// ================================
	// CHARITY MANAGEMENT
	// ================================

	/**
	 * @swagger
	 * /api/admin/charities:
	 *   get:
	 *     summary: Lấy danh sách tất cả tổ chức từ thiện
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
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
	 *         name: status
	 *         schema:
	 *           type: string
	 *           enum: [pending, verified, rejected]
	 *         description: Trạng thái xác thực
	 *       - in: query
	 *         name: search
	 *         schema:
	 *           type: string
	 *         description: Tìm kiếm theo tên hoặc mã số thuế
	 */
	getAllCharities = [
		async (req, res, next) => {
			try {
				const result = await adminService.getAllCharities(req.query);
				res.json(result);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/charities/{id}:
	 *   get:
	 *     summary: Lấy thông tin chi tiết tổ chức từ thiện
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	getCharityById = [
		async (req, res, next) => {
			try {
				const charity = await adminService.getCharityById(req.params.id);
				res.json(charity);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/charities/pending:
	 *   get:
	 *     summary: Lấy danh sách tổ chức từ thiện chờ xác thực
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	getPendingCharities = [
		async (req, res, next) => {
			try {
				const charities = await adminService.getPendingCharities();
				res.json(charities);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/charities/{id}/verify:
	 *   put:
	 *     summary: Xác thực hoặc từ chối tổ chức từ thiện
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	verifyCharity = [
		check('status').isIn(['verified', 'rejected']).withMessage('Trạng thái phải là verified hoặc rejected'),
		check('rejection_reason')
			.optional()
			.isLength({ min: 10 })
			.withMessage('Lý do từ chối phải có ít nhất 10 ký tự'),
		validate,
		async (req, res, next) => {
			try {
				const { status, rejection_reason } = req.body;
				const charity = await adminService.verifyCharity(
					req.params.id,
					status,
					rejection_reason,
					req.user.user_id
				);
				res.json(charity);
			} catch (error) {
				next(error);
			}
		},
	];

	// ================================
	// PROJECT APPROVAL
	// ================================

	/**
	 * @swagger
	 * /api/admin/campaigns:
	 *   get:
	 *     summary: Lấy danh sách tất cả chiến dịch
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	getAllCampaigns = [
		async (req, res, next) => {
			try {
				const result = await adminService.getAllCampaigns(req.query);
				res.json(result);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/campaigns/pending:
	 *   get:
	 *     summary: Lấy danh sách chiến dịch chờ phê duyệt
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	getPendingCampaigns = [
		async (req, res, next) => {
			try {
				const campaigns = await adminService.getPendingCampaigns();
				res.json(campaigns);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/campaigns/{id}:
	 *   get:
	 *     summary: Lấy thông tin chi tiết chiến dịch (bao gồm campaign pending)
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	getCampaignById = [
		async (req, res, next) => {
			try {
				const campaign = await adminService.getCampaignById(req.params.id);
				res.json(campaign);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/campaigns/{id}/approve:
	 *   put:
	 *     summary: Phê duyệt chiến dịch
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	approveCampaign = [
		async (req, res, next) => {
			try {
				const campaign = await adminService.approveCampaign(req.params.id, req.user.user_id);
				res.json(campaign);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/campaigns/{id}/reject:
	 *   put:
	 *     summary: Từ chối chiến dịch
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	rejectCampaign = [
		check('rejection_reason')
			.notEmpty()
			.isLength({ min: 10 })
			.withMessage('Lý do từ chối là bắt buộc và phải có ít nhất 10 ký tự'),
		validate,
		async (req, res, next) => {
			try {
				const campaign = await adminService.rejectCampaign(
					req.params.id,
					req.body.rejection_reason,
					req.user.user_id
				);
				res.json(campaign);
			} catch (error) {
				next(error);
			}
		},
	];

	// ================================
	// DAO MEMBER MANAGEMENT
	// ================================

	/**
	 * @swagger
	 * /api/admin/users:
	 *   get:
	 *     summary: Lấy danh sách tất cả người dùng
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	getAllUsers = [
		async (req, res, next) => {
			try {
				const result = await adminService.getAllUsers(req.query);
				res.json(result);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/users/{id}/approve-dao:
	 *   put:
	 *     summary: Phê duyệt thành viên DAO
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	approveDAOMember = [
		async (req, res, next) => {
			try {
				const user = await adminService.approveDAOMember(req.params.id, req.user.user_id);
				res.json(user);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/users/{id}/reject-dao:
	 *   put:
	 *     summary: Từ chối thành viên DAO
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	rejectDAOMember = [
		check('rejection_reason')
			.notEmpty()
			.isLength({ min: 10 })
			.withMessage('Lý do từ chối là bắt buộc và phải có ít nhất 10 ký tự'),
		validate,
		async (req, res, next) => {
			try {
				const user = await adminService.rejectDAOMember(
					req.params.id,
					req.body.rejection_reason,
					req.user.user_id
				);
				res.json(user);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/users/{id}/ban:
	 *   put:
	 *     summary: Cấm người dùng
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	banUser = [
		check('reason')
			.notEmpty()
			.isLength({ min: 10 })
			.withMessage('Lý do cấm là bắt buộc và phải có ít nhất 10 ký tự'),
		validate,
		async (req, res, next) => {
			try {
				const user = await adminService.banUser(req.params.id, req.body.reason, req.user.user_id);
				res.json(user);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/users/{id}/unban:
	 *   put:
	 *     summary: Bỏ cấm người dùng
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	unbanUser = [
		async (req, res, next) => {
			try {
				const user = await adminService.unbanUser(req.params.id, req.user.user_id);
				res.json(user);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/users/{id}/role:
	 *   put:
	 *     summary: Đổi role người dùng
	 *     tags: [Admin Management]
	 */
	updateUserRole = [
		async (req, res, next) => {
			try {
				const { role } = req.body;
				const user = await adminService.updateUserRole(req.params.id, role, req.user.user_id);
				res.json(user);
			} catch (error) {
				next(error);
			}
		},
	];

	// ================================
	// VOTING MANAGEMENT
	// ================================

	/**
	 * @swagger
	 * /api/admin/votes:
	 *   get:
	 *     summary: Lấy danh sách tất cả vote
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	getAllVotes = [
		async (req, res, next) => {
			try {
				const result = await adminService.getAllVotes(req.query);
				res.json(result);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/votes/{id}:
	 *   delete:
	 *     summary: Xóa vote
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	deleteVote = [
		async (req, res, next) => {
			try {
				const result = await adminService.deleteVote(req.params.id, req.user.user_id);
				res.json(result);
			} catch (error) {
				next(error);
			}
		},
	];

	// ================================
	// NEWS MANAGEMENT
	// ================================

	/**
	 * @swagger
	 * /api/admin/news:
	 *   post:
	 *     summary: Tạo tin tức mới
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	createNews = [
		check('title').notEmpty().isLength({ min: 5, max: 200 }).withMessage('Tiêu đề phải từ 5-200 ký tự'),
		check('content').notEmpty().isLength({ min: 20 }).withMessage('Nội dung phải có ít nhất 20 ký tự'),
		check('category')
			.optional()
			.isIn(['announcement', 'update', 'campaign', 'charity', 'system'])
			.withMessage('Danh mục không hợp lệ'),
		check('priority')
			.optional()
			.isIn(['low', 'medium', 'high', 'urgent'])
			.withMessage('Mức độ ưu tiên không hợp lệ'),
		validate,
		async (req, res, next) => {
			try {
				const news = await adminService.createNews(req.body, req.user.user_id);
				res.status(201).json(news);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/news:
	 *   get:
	 *     summary: Lấy danh sách tất cả tin tức
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	getAllNews = [
		async (req, res, next) => {
			try {
				const result = await adminService.getAllNews(req.query);
				res.json(result);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/news/{id}:
	 *   get:
	 *     summary: Lấy thông tin chi tiết tin tức
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	getNewsById = [
		async (req, res, next) => {
			try {
				const news = await adminService.getNewsById(req.params.id);
				res.json(news);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/news/{id}:
	 *   put:
	 *     summary: Cập nhật tin tức
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	updateNews = [
		check('title').optional().isLength({ min: 5, max: 200 }).withMessage('Tiêu đề phải từ 5-200 ký tự'),
		check('content').optional().isLength({ min: 20 }).withMessage('Nội dung phải có ít nhất 20 ký tự'),
		validate,
		async (req, res, next) => {
			try {
				const news = await adminService.updateNews(req.params.id, req.body, req.user.user_id);
				res.json(news);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/news/{id}:
	 *   delete:
	 *     summary: Xóa tin tức
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	deleteNews = [
		async (req, res, next) => {
			try {
				const result = await adminService.deleteNews(req.params.id, req.user.user_id);
				res.json(result);
			} catch (error) {
				next(error);
			}
		},
	];

	/**
	 * @swagger
	 * /api/admin/news/{id}/publish:
	 *   put:
	 *     summary: Xuất bản tin tức
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	publishNews = [
		async (req, res, next) => {
			try {
				const news = await adminService.publishNews(req.params.id, req.user.user_id);
				res.json(news);
			} catch (error) {
				next(error);
			}
		},
	];

	// ================================
	// DASHBOARD
	// ================================

	/**
	 * @swagger
	 * /api/admin/dashboard/stats:
	 *   get:
	 *     summary: Lấy thống kê tổng quan cho dashboard admin
	 *     tags: [Admin Management]
	 *     security:
	 *       - bearerAuth: []
	 */
	getDashboardStats = [
		async (req, res, next) => {
			try {
				const stats = await adminService.getDashboardStats();
				res.json(stats);
			} catch (error) {
				next(error);
			}
		},
	];
}

module.exports = new AdminController();
