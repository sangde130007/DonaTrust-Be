const { check } = require('express-validator');
const daoApplicationService = require('../services/daoApplicationService');
const validate = require('../middleware/validationMiddleware');

/**
 * @swagger
 * tags:
 *   name: DAO Applications
 *   description: API quản lý đăng ký thành viên DAO
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DAOApplication:
 *       type: object
 *       properties:
 *         application_id:
 *           type: string
 *           format: uuid
 *           description: ID đơn đăng ký
 *         user_id:
 *           type: string
 *           description: ID người dùng
 *         full_name:
 *           type: string
 *           example: "Nguyễn Văn A"
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         introduction:
 *           type: string
 *           description: Giới thiệu bản thân (tối thiểu 50 ký tự)
 *           example: "Tôi là một lập trình viên với đam mê công nghệ blockchain..."
 *         experience:
 *           type: string
 *           description: Kinh nghiệm trong lĩnh vực từ thiện/DAO (tối thiểu 50 ký tự)
 *           example: "Tôi đã tham gia nhiều dự án từ thiện và có hiểu biết về quản trị phi tập trung..."
 *         areas_of_interest:
 *           type: object
 *           description: Các lĩnh vực quan tâm
 *           properties:
 *             education:
 *               type: boolean
 *               example: true
 *             health:
 *               type: boolean
 *               example: true
 *             end_date:
           type: string
           format: date
         category:
           type: string
           example: "education"
         status:
           type: string
           example: "pending"
         approval_status:
           type: string
           example: "pending"
         dao_approval_status:
           type: string
           enum: [pending, dao_approved, dao_rejected]
           example: "pending"
         charity:
           type: object
           properties:
             charity_id:
               type: string
             name:
               type: string
               example: "Quỹ từ thiện ABC"
             verification_status:
               type: string
               example: "verified"
         user_vote:
           type: object
           nullable: true
           description: Vote của user hiện tại (null nếu chưa vote)
           properties:
             decision:
               type: string
               enum: [approve, reject]
             reason:
               type: string
             created_at:
               type: string
               format: date-time
         vote_stats:
           type: object
           properties:
             total_votes:
               type: integer
               example: 7
             approve_votes:
               type: integer
               example: 5
             reject_votes:
               type: integer
               example: 2
             approval_rate:
               type: string
               example: "71.4"
               description: "Tỷ lệ approve (phần trăm)"
             meets_threshold:
               type: boolean
               example: true
               description: "Có đạt ngưỡng vote chưa (≥5 votes và >50%)"
             voter_list:
               type: array
               items:
                 type: object
                 properties:
                   voter_name:
                     type: string
                   decision:
                     type: string
                   reason:
                     type: string
                   created_at:
                     type: string
                     format: date-time
 *     
 *     DAOStats:
 *       type: object
 *       properties:
 *         total_dao_members:
 *           type: integer
 *           example: 12
 *           description: Tổng số DAO members đang active
 *         pending_campaigns:
 *           type: integer
 *           example: 5
 *           description: Số campaigns đang chờ DAO vote
 *         dao_approved_campaigns:
 *           type: integer
 *           example: 18
 *           description: Số campaigns đã được DAO approve
 *         dao_rejected_campaigns:
 *           type: integer
 *           example: 3
 *           description: Số campaigns bị DAO reject
 *         total_votes_cast:
 *           type: integer
 *           example: 147
 *           description: Tổng số votes đã được cast
 *         my_vote_count:
 *           type: integer
 *           example: 23
 *           description: Số votes mà user hiện tại đã cast
 */