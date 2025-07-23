const { check } = require('express-validator');
const authService = require('../services/authService');
const validate = require('../middleware/validationMiddleware');

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
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
 *                 description: Google ID Token từ frontend
 *               code:
 *                 type: string
 *                 example: "4/0AX4XfWi..."
 *                 description: Google Authorization Code (alternative)
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
 *         description: Token Google không hợp lệ
 */
exports.googleLogin = [
	// Validate that either token or code is provided
	check('token').optional().notEmpty().withMessage('Google token không được để trống'),
	check('code').optional().notEmpty().withMessage('Google code không được để trống'),
	// Custom validation to ensure at least one is provided
	(req, res, next) => {
		if (!req.body.token && !req.body.code) {
			return res.status(400).json({
				status: 'error',
				message: 'Cần cung cấp Google token hoặc authorization code',
			});
		}
		next();
	},
	validate,
	async (req, res, next) => {
		try {
			console.log('🔍 Google login request body:', {
				hasToken: !!req.body.token,
				hasCode: !!req.body.code,
				tokenPreview: req.body.token ? req.body.token.substring(0, 50) + '...' : null,
				codePreview: req.body.code ? req.body.code.substring(0, 20) + '...' : null,
			});

			let result;

			// Handle Google ID Token (from @react-oauth/google)
			if (req.body.token) {
				console.log('📱 Processing Google ID Token...');
				result = await authService.googleLoginWithToken(req.body.token);
			}
			// Handle Google Authorization Code (traditional OAuth flow)
			else if (req.body.code) {
				console.log('🔐 Processing Google Authorization Code...');
				result = await authService.googleLoginWithCode(req.body.code);
			}

			console.log('✅ Google login successful for user:', result.user.email);
			res.json(result);
		} catch (error) {
			console.error('❌ Google login failed:', error.message);
			next(error);
		}
	},
];

// Other auth controllers remain the same...
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

exports.verifyEmail = [
	check('token').notEmpty().withMessage('Token xác thực là bắt buộc'),
	validate,
	async (req, res, next) => {
		try {
			const user = await authService.verifyEmail(req.query.token);
			res.json({ message: 'Xác thực email thành công', user });
		} catch (error) {
			next(error);
		}
	},
];

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
