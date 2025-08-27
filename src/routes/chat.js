const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');

/**
 * @swagger
 * components:
 *   schemas:
 *     ChatRoom:
 *       type: object
 *       properties:
 *         roomId:
 *           type: string
 *           description: ID của chat room
 *         participantCount:
 *           type: integer
 *           description: Số người tham gia
 *         canChat:
 *           type: boolean
 *           description: Có thể chat hay không
 *     
 *     ChatMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID của tin nhắn
 *         userId:
 *           type: string
 *           description: ID người gửi
 *         userName:
 *           type: string
 *           description: Tên người gửi
 *         message:
 *           type: string
 *           description: Nội dung tin nhắn
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Thời gian gửi
 */

/**
 * @swagger
 * /api/chat/charity/{charityId}/join:
 *   post:
 *     summary: Tham gia chat room của tổ chức từ thiện
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: charityId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tổ chức từ thiện
 *     responses:
 *       200:
 *         description: Thành công tham gia chat room
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/ChatRoom'
 *       404:
 *         description: Không tìm thấy tổ chức từ thiện
 *       401:
 *         description: Không được xác thực
 */
router.post('/charity/:charityId/join', authMiddleware, chatController.joinCharityChat);

/**
 * @swagger
 * /api/chat/campaign/{campaignId}/join:
 *   post:
 *     summary: Tham gia chat room của chiến dịch
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của chiến dịch
 *     responses:
 *       200:
 *         description: Thành công tham gia chat room
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/ChatRoom'
 *       404:
 *         description: Không tìm thấy chiến dịch
 *       401:
 *         description: Không được xác thực
 */
router.post('/campaign/:campaignId/join', authMiddleware, chatController.joinCampaignChat);

/**
 * @swagger
 * /api/chat/rooms/active:
 *   get:
 *     summary: Lấy danh sách chat rooms đang hoạt động (Admin only)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách chat rooms hoạt động
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     activeRooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           roomId:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [charity, campaign]
 *                           participantCount:
 *                             type: integer
 *                           lastActivity:
 *                             type: string
 *                             format: date-time
 *                     totalRooms:
 *                       type: integer
 *       403:
 *         description: Không có quyền truy cập
 *       401:
 *         description: Không được xác thực
 */
router.get('/rooms/active', authMiddleware, chatController.getActiveChatRooms);

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Gửi tin nhắn đến chat room
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - message
 *             properties:
 *               roomId:
 *                 type: string
 *                 description: ID của chat room
 *               message:
 *                 type: string
 *                 description: Nội dung tin nhắn
 *               messageType:
 *                 type: string
 *                 default: text
 *                 enum: [text, image, file]
 *                 description: Loại tin nhắn
 *     responses:
 *       200:
 *         description: Tin nhắn được gửi thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/ChatMessage'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không được xác thực
 */
router.post('/message', authMiddleware, chatController.sendMessage);

/**
 * @swagger
 * /api/chat/messages/{roomId}:
 *   get:
 *     summary: Lấy tin nhắn của chat room
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của chat room
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Số tin nhắn mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChatMessage'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không được xác thực
 */
router.get('/messages/:roomId', authMiddleware, chatController.getChatMessages);

module.exports = router;
