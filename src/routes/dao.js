// src/routes/dao.js
const express = require('express');
const router = express.Router();
const daoController = require('../controllers/daoController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     DAOVoteRequest:
 *       type: object
 *       required:
 *         - decision
 *       properties:
 *         decision:
 *           type: string
 *           enum: [approve, reject]
 *           example: approve
 *           description: Quyết định vote
 *         reason:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           example: "Campaign có mục tiêu rõ ràng và khả thi"
 *           description: Lý do vote (tùy chọn)
 *     
 *     DAOCampaignStats:
 *       type: object
 *       properties:
 *         total_votes:
 *           type: integer
 *           example: 7
 *         approve_votes:
 *           type: integer
 *           example: 5
 *         reject_votes:
 *           type: integer
 *           example: 2
 *         approval_rate:
 *           type: string
 *           example: "71.4"
 *         needs_more_votes:
 *           type: boolean
 *           example: false
 *         meets_threshold:
 *           type: boolean
 *           example: true
 *         voter_list:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               voter_name:
 *                 type: string
 *                 example: "Nguyễn DAO Member"
 *               decision:
 *                 type: string
 *                 example: "approve"
 *               reason:
 *                 type: string
 *                 example: "Mục tiêu tốt"
 *               created_at:
 *                 type: string
 *                 format: date-time
 *     
 *     DAOCampaignDetail:
 *       type: object
 *       properties:
 *         campaign_id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *           example: "Xây trường học vùng cao"
 *         description:
 *           type: string
 *         goal_amount:
 *           type: number
 *           example: 500000000
 *         charity:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: "Quỹ từ thiện ABC"
 *             verification_status:
 *               type: string
 *               example: "verified"
 *         user_vote:
 *           type: object
 *           nullable: true
 *           properties:
 *             decision:
 *               type: string
 *               example: "approve"
 *             reason:
 *               type: string
 *               example: "Campaign tốt"
 *             created_at:
 *               type: string
 *               format: date-time
 *         vote_stats:
 *           $ref: '#/components/schemas/DAOCampaignStats'
 */

// Apply auth middleware
router.use(authMiddleware);

/**
 * @swagger
 * /api/dao/campaigns/pending:
 *   get:
 *     summary: Lấy danh sách campaigns chờ vote DAO
 *     description: Chỉ DAO members mới có thể truy cập. Hiển thị campaigns đang pending với thông tin vote hiện tại.
 *     tags: [DAO Management]
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
 *         name: category
 *         schema:
 *           type: string
 *           enum: [education, health, environment, poverty, disaster, children, elderly, disability, animals, community]
 *         description: Lọc theo danh mục
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tiêu đề hoặc mô tả
 *     responses:
 *       200:
 *         description: Danh sách campaigns pending thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       campaign_id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       goal_amount:
 *                         type: number
 *                       charity:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           verification_status:
 *                             type: string
 *                       vote_stats:
 *                         $ref: '#/components/schemas/DAOCampaignStats'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (chỉ DAO members)
 */
router.get('/campaigns/pending', requireRole('dao_member'), daoController.getPendingCampaigns);

/**
 * @swagger
 * /api/dao/campaigns/{id}:
 *   get:
 *     summary: Lấy chi tiết campaign với thông tin vote
 *     description: Xem chi tiết campaign pending bao gồm thông tin vote của user hiện tại và tất cả votes đã có.
 *     tags: [DAO Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của campaign
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Chi tiết campaign thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DAOCampaignDetail'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (chỉ DAO members)
 *       404:
 *         description: Không tìm thấy campaign hoặc campaign đã được xử lý
 */
router.get('/campaigns/:id', requireRole('dao_member'), daoController.getCampaignDetail);

/**
 * @swagger
 * /api/dao/campaigns/{id}/vote:
 *   post:
 *     summary: Vote cho campaign
 *     description: DAO member vote approve/reject cho campaign. Mỗi user chỉ vote được 1 lần cho mỗi campaign.
 *     tags: [DAO Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của campaign
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DAOVoteRequest'
 *           examples:
 *             approve:
 *               summary: Vote approve
 *               value:
 *                 decision: "approve"
 *                 reason: "Campaign có mục tiêu rõ ràng, tổ chức từ thiện uy tín và khả thi"
 *             reject:
 *               summary: Vote reject
 *               value:
 *                 decision: "reject"
 *                 reason: "Thiếu thông tin chi tiết về việc sử dụng tiền quyên góp"
 *     responses:
 *       201:
 *         description: Vote thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vote thành công"
 *                 vote:
 *                   type: object
 *                   properties:
 *                     vote_id:
 *                       type: string
 *                       format: uuid
 *                     campaign_id:
 *                       type: string
 *                       format: uuid
 *                     voter_id:
 *                       type: string
 *                     vote_decision:
 *                       type: string
 *                       example: "approve"
 *                     vote_reason:
 *                       type: string
 *                       example: "Campaign có mục tiêu rõ ràng"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Lỗi validation hoặc đã vote rồi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Bạn đã vote cho chiến dịch này rồi"
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (chỉ DAO members)
 *       404:
 *         description: Không tìm thấy campaign
 */
router.post('/campaigns/:id/vote', requireRole('dao_member'), daoController.voteCampaign);

/**
 * @swagger
 * /api/dao/stats:
 *   get:
 *     summary: Lấy thống kê DAO
 *     description: Hiển thị các thống kê tổng quan về hoạt động của DAO bao gồm số lượng members, campaigns, votes.
 *     tags: [DAO Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê DAO thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_dao_members:
 *                   type: integer
 *                   example: 10
 *                   description: Tổng số DAO members đang active
 *                 pending_campaigns:
 *                   type: integer
 *                   example: 5
 *                   description: Số campaigns đang chờ vote
 *                 dao_approved_campaigns:
 *                   type: integer
 *                   example: 15
 *                   description: Số campaigns đã được DAO approve
 *                 dao_rejected_campaigns:
 *                   type: integer
 *                   example: 3
 *                   description: Số campaigns bị DAO reject
 *                 total_votes_cast:
 *                   type: integer
 *                   example: 127
 *                   description: Tổng số votes đã được cast
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (chỉ DAO members)
 */
router.get('/stats', requireRole('dao_member'), daoController.getStats);

/**
 * @swagger
 * /api/dao/my-votes:
 *   get:
 *     summary: Lấy lịch sử vote của user hiện tại
 *     description: DAO member xem lịch sử các vote đã thực hiện
 *     tags: [DAO Management]
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
 *     responses:
 *       200:
 *         description: Lịch sử vote thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 votes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       vote_id:
 *                         type: string
 *                         format: uuid
 *                       campaign_id:
 *                         type: string
 *                         format: uuid
 *                       vote:
 *                         type: string
 *                         enum: [approve, reject]
 *                       reason:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       campaign:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           charity:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
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
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (chỉ DAO members)
 */
router.get('/my-votes', requireRole('dao_member'), daoController.getMyVotes);

/**
 * @swagger
 * /api/dao/my-vote-statistics:
 *   get:
 *     summary: Lấy thống kê vote của user hiện tại
 *     description: DAO member xem thống kê các vote đã thực hiện
 *     tags: [DAO Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê vote thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalVotes:
 *                   type: integer
 *                   example: 15
 *                 approveVotes:
 *                   type: integer
 *                   example: 12
 *                 rejectVotes:
 *                   type: integer
 *                   example: 3
 *                 approvalRate:
 *                   type: string
 *                   example: "80.0"
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (chỉ DAO members)
 */
router.get('/my-vote-statistics', requireRole('dao_member'), daoController.getMyVoteStatistics);

/**
 * @swagger
 * /api/dao/campaigns/dao-approved:
 *   get:
 *     summary: Lấy danh sách campaigns đã được DAO approve (Admin only)
 *     description: Admin xem danh sách campaigns đã pass vote DAO và đang chờ admin duyệt cuối cùng.
 *     tags: [DAO Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách campaigns đã được DAO approve
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   campaign_id:
 *                     type: string
 *                     format: uuid
 *                   title:
 *                     type: string
 *                   dao_approval_rate:
 *                     type: string
 *                     example: "75.0"
 *                   dao_approved_at:
 *                     type: string
 *                     format: date-time
 *                   charity:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                   dao_votes:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         vote_decision:
 *                           type: string
 *                         voter:
 *                           type: object
 *                           properties:
 *                             full_name:
 *                               type: string
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (chỉ admin)
 */
router.get('/campaigns/dao-approved', requireRole('admin'), daoController.getDAOApprovedCampaigns);

/**
 * @swagger
 * /api/dao/campaigns/dao-rejected:
 *   get:
 *     summary: Lấy danh sách campaigns bị DAO reject (Admin only)
 *     description: Admin xem danh sách campaigns không pass vote DAO (≤50% approval rate).
 *     tags: [DAO Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách campaigns bị DAO reject
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   campaign_id:
 *                     type: string
 *                     format: uuid
 *                   title:
 *                     type: string
 *                   dao_approval_rate:
 *                     type: string
 *                     example: "30.0"
 *                   dao_rejected_at:
 *                     type: string
 *                     format: date-time
 *                   rejection_reason:
 *                     type: string
 *                     example: "Campaign không đạt yêu cầu vote DAO (30.0% approval rate)"
 *                   charity:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (chỉ admin)
 */
router.get('/campaigns/dao-rejected', requireRole('admin'), daoController.getDAORejectedCampaigns);

module.exports = router;