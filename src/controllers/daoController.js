const { check } = require('express-validator');
const daoService = require('../services/daoService');
const validate = require('../middleware/validationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

/**
 * @swagger
 * tags:
 *   name: DAO Management
 *   description: API quản lý DAO member applications
 */

/**
 * @swagger
 * /api/dao/register:
 *   post:
 *     summary: Đăng ký trở thành DAO member
 *     tags: [DAO Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - introduction
 *               - experience
 *               - areasOfInterest
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               introduction:
 *                 type: string
 *                 example: "Tôi muốn tham gia DAO để..."
 *               experience:
 *                 type: string
 *                 example: "Tôi có kinh nghiệm trong..."
 *               areasOfInterest:
 *                 type: string
 *                 example: '{"education": true, "medical": false}'
 *               certificates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc đã đăng ký
 */
exports.registerDao = [
  authMiddleware,
  check('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ tên phải từ 2-100 ký tự')
    .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
    .withMessage('Họ tên chỉ được chứa chữ cái và khoảng trắng'),
  check('email')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  check('introduction')
    .trim()
    .isLength({ min: 50, max: 1000 })
    .withMessage('Giới thiệu phải từ 50-1000 ký tự'),
  check('experience')
    .trim()
    .isLength({ min: 50, max: 1000 })
    .withMessage('Kinh nghiệm phải từ 50-1000 ký tự'),
  check('areasOfInterest')
    .custom((value) => {
      try {
        const interests = JSON.parse(value);
        const hasAtLeastOne = Object.values(interests).some(val => val === true);
        if (!hasAtLeastOne) {
          throw new Error('Phải chọn ít nhất một lĩnh vực quan tâm');
        }
        return true;
      } catch (error) {
        throw new Error('Dữ liệu lĩnh vực quan tâm không hợp lệ');
      }
    }),
  validate,
  async (req, res, next) => {
    try {
      // Parse areas of interest
      const areasOfInterest = JSON.parse(req.body.areasOfInterest);
      const applicationData = {
        ...req.body,
        areasOfInterest,
      };

      const application = await daoService.registerDao(
        req.user.user_id,
        applicationData,
        req.files
      );

      res.status(201).json({
        message: 'Đăng ký DAO member thành công, đang chờ xét duyệt',
        application: {
          ...application.toJSON(),
          certificate_files: application.certificate_files.map(file => ({
            originalName: file.originalName,
            uploadedAt: file.uploadedAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * @swagger
 * /api/dao/my-application:
 *   get:
 *     summary: Lấy đơn đăng ký DAO của tôi
 *     tags: [DAO Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin đơn đăng ký
 *       404:
 *         description: Chưa có đơn đăng ký
 */
exports.getMyApplication = [
  authMiddleware,
  async (req, res, next) => {
    try {
      const application = await daoService.getMyApplication(req.user.user_id);
      res.json({
        ...application.toJSON(),
        certificate_files: application.certificate_files.map(file => ({
          originalName: file.originalName,
          uploadedAt: file.uploadedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * @swagger
 * /api/dao/applications:
 *   get:
 *     summary: Lấy tất cả đơn đăng ký DAO (Admin only)
 *     tags: [DAO Management]
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
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Danh sách đơn đăng ký
 */
exports.getAllApplications = [
  authMiddleware,
  roleMiddleware(['admin']),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const result = await daoService.getAllApplications(page, limit, status);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * @swagger
 * /api/dao/applications/{id}:
 *   get:
 *     summary: Lấy chi tiết đơn đăng ký (Admin only)
 *     tags: [DAO Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết đơn đăng ký
 *       404:
 *         description: Không tìm thấy đơn đăng ký
 */
exports.getApplicationById = [
  authMiddleware,
  roleMiddleware(['admin']),
  async (req, res, next) => {
    try {
      const application = await daoService.getApplicationById(req.params.id);
      res.json(application);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * @swagger
 * /api/dao/applications/{id}/approve:
 *   post:
 *     summary: Duyệt đơn đăng ký DAO (Admin only)
 *     tags: [DAO Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Duyệt thành công
 *       400:
 *         description: Đơn đã được xử lý
 *       404:
 *         description: Không tìm thấy đơn đăng ký
 */
exports.approveApplication = [
  authMiddleware,
  roleMiddleware(['admin']),
  async (req, res, next) => {
    try {
      const application = await daoService.approveApplication(
        req.params.id,
        req.user.user_id
      );
      res.json({
        message: 'Duyệt đơn đăng ký DAO thành công',
        application,
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * @swagger
 * /api/dao/applications/{id}/reject:
 *   post:
 *     summary: Từ chối đơn đăng ký DAO (Admin only)
 *     tags: [DAO Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 example: "Không đủ kinh nghiệm"
 *     responses:
 *       200:
 *         description: Từ chối thành công
 *       400:
 *         description: Đơn đã được xử lý
 *       404:
 *         description: Không tìm thấy đơn đăng ký
 */
exports.rejectApplication = [
  authMiddleware,
  roleMiddleware(['admin']),
  check('rejectionReason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Lý do từ chối phải từ 10-500 ký tự'),
  validate,
  async (req, res, next) => {
    try {
      const application = await daoService.rejectApplication(
        req.params.id,
        req.user.user_id,
        req.body.rejectionReason
      );
      res.json({
        message: 'Từ chối đơn đăng ký DAO thành công',
        application,
      });
    } catch (error) {
      next(error);
    }
  },
];