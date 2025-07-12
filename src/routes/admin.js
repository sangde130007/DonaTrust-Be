const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

/**
 * @swagger
 * tags:
 *   name: Admin Management
 *   description: API quản lý hệ thống dành cho admin
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminCharityVerification:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [verified, rejected]
 *           example: verified
 *         rejection_reason:
 *           type: string
 *           example: "Tài liệu không đầy đủ"
 *     AdminCampaignRejection:
 *       type: object
 *       required:
 *         - rejection_reason
 *       properties:
 *         rejection_reason:
 *           type: string
 *           example: "Nội dung không phù hợp"
 *     AdminUserBan:
 *       type: object
 *       required:
 *         - reason
 *       properties:
 *         reason:
 *           type: string
 *           example: "Vi phạm quy định"
 *     AdminDAORejection:
 *       type: object
 *       required:
 *         - rejection_reason
 *       properties:
 *         rejection_reason:
 *           type: string
 *           example: "Không đủ điều kiện"
 *     AdminNewsCreate:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         title:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *           example: "Tin tức mới từ DonaTrust"
 *         content:
 *           type: string
 *           minLength: 20
 *           example: "Nội dung tin tức chi tiết..."
 *         category:
 *           type: string
 *           enum: [announcement, update, campaign, charity, system]
 *           example: announcement
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           example: medium
 */

// Apply auth middleware and admin role check to all routes
router.use(authMiddleware);
router.use(requireAdmin);

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
 *     responses:
 *       200:
 *         description: Thống kê dashboard thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                   example: 1250
 *                 totalCharities:
 *                   type: integer
 *                   example: 85
 *                 totalCampaigns:
 *                   type: integer
 *                   example: 342
 *                 pendingCharities:
 *                   type: integer
 *                   example: 12
 *                 pendingCampaigns:
 *                   type: integer
 *                   example: 8
 *                 totalDonations:
 *                   type: integer
 *                   example: 5420
 *                 totalNews:
 *                   type: integer
 *                   example: 156
 *                 totalDonationAmount:
 *                   type: number
 *                   example: 2500000000
 *                 pendingApprovals:
 *                   type: integer
 *                   example: 20
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không phải admin
 */
router.get('/dashboard/stats', adminController.getDashboardStats);

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
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
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
 *     responses:
 *       200:
 *         description: Danh sách tổ chức từ thiện
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 charities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Charity'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/charities', adminController.getAllCharities);

/**
 * @swagger
 * /api/admin/charities/pending:
 *   get:
 *     summary: Lấy danh sách tổ chức từ thiện chờ xác thực
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách tổ chức chờ xác thực
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Charity'
 */
router.get('/charities/pending', adminController.getPendingCharities);

/**
 * @swagger
 * /api/admin/charities/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết tổ chức từ thiện
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tổ chức từ thiện
 *     responses:
 *       200:
 *         description: Thông tin chi tiết tổ chức
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Charity'
 *       404:
 *         description: Không tìm thấy tổ chức
 */
router.get('/charities/:id', adminController.getCharityById);

/**
 * @swagger
 * /api/admin/charities/{id}/verify:
 *   put:
 *     summary: Xác thực hoặc từ chối tổ chức từ thiện
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tổ chức từ thiện
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminCharityVerification'
 *     responses:
 *       200:
 *         description: Xác thực thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Charity'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy tổ chức
 */
router.put('/charities/:id/verify', adminController.verifyCharity);

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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: approval_status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, pending, paused, cancelled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tiêu đề
 *     responses:
 *       200:
 *         description: Danh sách chiến dịch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Campaign'
 *                 pagination:
 *                   type: object
 */
router.get('/campaigns', adminController.getAllCampaigns);

/**
 * @swagger
 * /api/admin/campaigns/pending:
 *   get:
 *     summary: Lấy danh sách chiến dịch chờ phê duyệt
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách chiến dịch chờ phê duyệt
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Campaign'
 */
router.get('/campaigns/pending', adminController.getPendingCampaigns);

/**
 * @swagger
 * /api/admin/campaigns/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết chiến dịch (bao gồm campaign pending)
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của chiến dịch
 *     responses:
 *       200:
 *         description: Thông tin chi tiết chiến dịch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaign_id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 detailed_description:
 *                   type: string
 *                 goal_amount:
 *                   type: number
 *                 current_amount:
 *                   type: number
 *                 start_date:
 *                   type: string
 *                 end_date:
 *                   type: string
 *                 category:
 *                   type: string
 *                 status:
 *                   type: string
 *                 approval_status:
 *                   type: string
 *                 rejection_reason:
 *                   type: string
 *                 location:
 *                   type: string
 *                 beneficiaries:
 *                   type: string
 *                 expected_impact:
 *                   type: string
 *                 image_url:
 *                   type: string
 *                 gallery_images:
 *                   type: array
 *                   items:
 *                     type: string
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: string
 *                 charity:
 *                   type: object
 *                   properties:
 *                     charity_id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     verification_status:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         full_name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                 donations:
 *                   type: array
 *                   items:
 *                     type: object
 *                 created_at:
 *                   type: string
 *                 updated_at:
 *                   type: string
 *       404:
 *         description: Không tìm thấy chiến dịch
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/campaigns/:id', adminController.getCampaignById);

/**
 * @swagger
 * /api/admin/campaigns/{id}/approve:
 *   put:
 *     summary: Phê duyệt chiến dịch
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của chiến dịch
 *     responses:
 *       200:
 *         description: Phê duyệt thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 */
router.put('/campaigns/:id/approve', adminController.approveCampaign);

/**
 * @swagger
 * /api/admin/campaigns/{id}/reject:
 *   put:
 *     summary: Từ chối chiến dịch
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của chiến dịch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminCampaignRejection'
 *     responses:
 *       200:
 *         description: Từ chối thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 */
router.put('/campaigns/:id/reject', adminController.rejectCampaign);

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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [donor, charity, admin, dao_member]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, banned]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên hoặc email
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 */
router.get('/users', adminController.getAllUsers);

/**
 * @swagger
 * /api/admin/users/{id}/approve-dao:
 *   put:
 *     summary: Phê duyệt thành viên DAO
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của người dùng
 *     responses:
 *       200:
 *         description: Phê duyệt thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put('/users/:id/approve-dao', adminController.approveDAOMember);

/**
 * @swagger
 * /api/admin/users/{id}/reject-dao:
 *   put:
 *     summary: Từ chối thành viên DAO
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminDAORejection'
 *     responses:
 *       200:
 *         description: Từ chối thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put('/users/:id/reject-dao', adminController.rejectDAOMember);

/**
 * @swagger
 * /api/admin/users/{id}/ban:
 *   put:
 *     summary: Cấm người dùng
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUserBan'
 *     responses:
 *       200:
 *         description: Cấm thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put('/users/:id/ban', adminController.banUser);

/**
 * @swagger
 * /api/admin/users/{id}/unban:
 *   put:
 *     summary: Bỏ cấm người dùng
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của người dùng
 *     responses:
 *       200:
 *         description: Bỏ cấm thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put('/users/:id/unban', adminController.unbanUser);

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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: campaign_id
 *         schema:
 *           type: string
 *         description: Lọc theo chiến dịch
 *     responses:
 *       200:
 *         description: Danh sách vote
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 votes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 */
router.get('/votes', adminController.getAllVotes);

/**
 * @swagger
 * /api/admin/votes/{id}:
 *   delete:
 *     summary: Xóa vote
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của vote
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vote đã được xóa thành công"
 */
router.delete('/votes/:id', adminController.deleteVote);

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminNewsCreate'
 *     responses:
 *       201:
 *         description: Tạo tin tức thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 news_id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 content:
 *                   type: string
 *                 status:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 */
router.post('/news', adminController.createNews);

/**
 * @swagger
 * /api/admin/news:
 *   get:
 *     summary: Lấy danh sách tất cả tin tức
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [announcement, update, campaign, charity, system]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tiêu đề hoặc nội dung
 *     responses:
 *       200:
 *         description: Danh sách tin tức
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 news:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 */
router.get('/news', adminController.getAllNews);

/**
 * @swagger
 * /api/admin/news/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết tin tức
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tin tức
 *     responses:
 *       200:
 *         description: Thông tin chi tiết tin tức
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/news/:id', adminController.getNewsById);

/**
 * @swagger
 * /api/admin/news/{id}:
 *   put:
 *     summary: Cập nhật tin tức
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tin tức
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *               priority:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.put('/news/:id', adminController.updateNews);

/**
 * @swagger
 * /api/admin/news/{id}:
 *   delete:
 *     summary: Xóa tin tức
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tin tức
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/news/:id', adminController.deleteNews);

/**
 * @swagger
 * /api/admin/news/{id}/publish:
 *   put:
 *     summary: Xuất bản tin tức
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tin tức
 *     responses:
 *       200:
 *         description: Xuất bản thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.put('/news/:id/publish', adminController.publishNews);

module.exports = router;
