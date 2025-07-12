const { check } = require('express-validator');
const authService = require('../services/authService');
const validate = require('../middleware/validationMiddleware');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *                 description: "Họ và tên đầy đủ"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *                 description: "Email duy nhất"
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *                 description: "Số điện thoại (10-11 số)"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "Password123"
 *                 description: "Mật khẩu (ít nhất 6 ký tự, có chữ hoa, chữ thường, số)"
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Đăng ký thành công, vui lòng kiểm tra email để xác thực"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 emailConfigured:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Lỗi validation hoặc email/phone đã tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
exports.register = [
	check('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
	check('password')
		.isLength({ min: 6 })
		.withMessage('Mật khẩu phải có ít nhất 6 ký tự')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'),
	check('phone')
		.matches(/^[0-9]{10,11}$/)
		.withMessage('Số điện thoại phải là 10-11 số'),
	check('full_name')
		.isLength({ min: 2, max: 100 })
		.withMessage('Họ tên phải từ 2-100 ký tự')
		.matches(/^[a-zA-ZÀ-ỹ\s]+$/)
		.withMessage('Họ tên chỉ được chứa chữ cái và khoảng trắng'),
	validate,
	async (req, res, next) => {
		try {
			const result = await authService.register(req.body);
			res.status(201).json(result);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Xác thực email
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token xác thực email
 *     responses:
 *       200:
 *         description: Xác thực email thành công
 *       400:
 *         description: Token không hợp lệ hoặc đã hết hạn
 */
exports.verifyEmail = [
	check('token').notEmpty().withMessage('Token xác thực là bắt buộc'),
	validate,
	async (req, res, next) => {
		try {
const user = await authService.verifyEmail(req.query.token);

if (user.alreadyVerified) {
	return res.json({ message: 'Email đã được xác thực trước đó', user });
}

res.json({ message: 'Xác thực email thành công', user });

		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Thông tin đăng nhập không chính xác
 *       403:
 *         description: Email chưa được xác thực hoặc tài khoản bị khóa
 *       423:
 *         description: Tài khoản bị khóa do đăng nhập sai quá nhiều lần
 */
exports.login = [
	check('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
	check('password').notEmpty().withMessage('Mật khẩu là bắt buộc'),
	validate,
	async (req, res, next) => {
		try {
			const { token, user } = await authService.login(req.body);
			res.json({ token, user });
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Đăng nhập bằng Google
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "4/0AX4XfWi..."
 *                 description: Authorization code từ Google OAuth
 *     responses:
 *       200:
 *         description: Đăng nhập Google thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Mã Google OAuth không hợp lệ
 */
exports.googleLogin = [
	check('code').notEmpty().withMessage('Mã Google OAuth là bắt buộc'),
	validate,
	async (req, res, next) => {
		try {
			const { token, user } = await authService.googleLogin(req.body.code);
			res.json({ token, user });
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Quên mật khẩu
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Email reset password đã được gửi (nếu email tồn tại)
 */
exports.forgotPassword = [
	check('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
	validate,
	async (req, res, next) => {
		try {
			const result = await authService.forgotPassword(req.body.email);
			res.json(result);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Đặt lại mật khẩu
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: "reset_token_here"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Mật khẩu đã được đặt lại thành công
 *       400:
 *         description: Token không hợp lệ hoặc đã hết hạn
 */
exports.resetPassword = [
	check('token').notEmpty().withMessage('Token reset password là bắt buộc'),
	check('password')
		.isLength({ min: 6 })
		.withMessage('Mật khẩu phải có ít nhất 6 ký tự')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'),
	validate,
	async (req, res, next) => {
		try {
			const result = await authService.resetPassword(req.body.token, req.body.password);
			res.json(result);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/auth/send-phone-verification:
 *   post:
 *     summary: Gửi mã xác thực số điện thoại
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mã xác thực đã được gửi
 *       401:
 *         description: Token không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng
 */
exports.sendPhoneVerification = [
	async (req, res, next) => {
		try {
			const result = await authService.sendPhoneVerification(req.user.user_id);
			res.json(result);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/auth/verify-phone:
 *   post:
 *     summary: Xác thực số điện thoại
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *                 description: Mã xác thực 6 số
 *     responses:
 *       200:
 *         description: Số điện thoại đã được xác thực thành công
 *       400:
 *         description: Mã xác thực không chính xác
 */
exports.verifyPhone = [
	check('code')
		.isLength({ min: 6, max: 6 })
		.withMessage('Mã xác thực phải là 6 số')
		.isNumeric()
		.withMessage('Mã xác thực chỉ chứa số'),
	validate,
	async (req, res, next) => {
		try {
			const result = await authService.verifyPhone(req.user.user_id, req.body.code);
			res.json(result);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
exports.logout = [
	async (req, res, next) => {
		try {
			const result = await authService.logout(req.user.user_id);
			res.json(result);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Làm mới token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token mới đã được tạo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */
exports.refreshToken = [
	async (req, res, next) => {
		try {
			const result = await authService.refreshToken(req.user.user_id);
			res.json(result);
		} catch (error) {
			next(error);
		}
	},
];
