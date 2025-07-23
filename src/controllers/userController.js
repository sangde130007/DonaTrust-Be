const { check } = require('express-validator');
const userService = require('../services/userService');
const validate = require('../middleware/validationMiddleware');

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Lấy thông tin hồ sơ người dùng
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin hồ sơ người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Token không hợp lệ
 */
exports.getProfile = async (req, res, next) => {
	try {
		const user = await userService.getProfile(req.user.user_id);
		res.json(user);
	} catch (error) {
		next(error);
	}
};

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Cập nhật hồ sơ người dùng
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "Nguyễn Văn B"
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *               district:
 *                 type: string
 *                 example: "Quận 1"
 *               ward:
 *                 type: string
 *                 example: "Phường Bến Nghé"
 *               address:
 *                 type: string
 *                 example: "123 Đường ABC"
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: "male"
 *               bio:
 *                 type: string
 *                 example: "Mô tả về bản thân"
 *     responses:
 *       200:
 *         description: Cập nhật hồ sơ thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
exports.updateProfile = [
	check('full_name')
		.optional()
		.trim()
		.isLength({ min: 2, max: 100 })
		.withMessage('Họ tên phải từ 2-100 ký tự')
		.matches(/^[a-zA-ZÀ-ỹ\s]*$/)
		.withMessage('Họ tên chỉ được chứa chữ cái và khoảng trắng'),

	check('phone').optional().trim().isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ'),

	check('district').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Quận/Huyện phải từ 2-100 ký tự'),

	check('ward').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Phường/Xã phải từ 2-100 ký tự'),

	check('address').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Địa chỉ phải từ 5-200 ký tự'),

	check('date_of_birth')
		.optional()
		.isISO8601()
		.withMessage('Ngày sinh không hợp lệ')
		.custom((value) => {
			const date = new Date(value);
			const now = new Date();
			if (date > now) {
				throw new Error('Ngày sinh không thể là ngày trong tương lai');
			}
			return true;
		}),

	check('gender').optional().trim().isIn(['male', 'female', 'other']).withMessage('Giới tính không hợp lệ'),

	check('bio').optional().trim().isLength({ max: 255 }).withMessage('Mô tả không được vượt quá 255 ký tự'),

	validate,
	async (req, res, next) => {
		try {
			const user = await userService.updateProfile(req.user.user_id, req.body);
			res.json({
				message: 'Profile updated successfully',
				user: user,
			});
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: Đổi mật khẩu
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *                 example: "oldPassword123"
 *               new_password:
 *                 type: string
 *                 minLength: 6
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu hiện tại không chính xác
 */
exports.changePassword = [
	check('current_password').notEmpty().withMessage('Mật khẩu hiện tại là bắt buộc'),
	check('new_password')
		.isLength({ min: 6 })
		.withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'),
	validate,
	async (req, res, next) => {
		try {
			const result = await userService.changePassword(
				req.user.user_id,
				req.body.current_password,
				req.body.new_password
			);
			res.json(result);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/users/upload-avatar:
 *   post:
 *     summary: Upload ảnh đại diện
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (JPEG, PNG, GIF, WebP, max 5MB)
 *     responses:
 *       200:
 *         description: Upload ảnh thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Avatar uploaded successfully"
 *                 avatar_url:
 *                   type: string
 *                   example: "/uploads/avatars/user123-1640995200000-123456789.jpg"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: File không hợp lệ
 *       413:
 *         description: File quá lớn
 */
exports.uploadAvatar = async (req, res, next) => {
	try {
		console.log('📁 Avatar upload request:', {
			userId: req.user?.user_id,
			file: req.file
				? {
						filename: req.file.filename,
						originalname: req.file.originalname,
						mimetype: req.file.mimetype,
						size: req.file.size,
				  }
				: 'No file',
		});

		if (!req.file) {
			return res.status(400).json({
				status: 'error',
				message: 'No file uploaded. Please select an image file.',
			});
		}

		// Validate file type (double check after multer)
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
		if (!allowedTypes.includes(req.file.mimetype)) {
			return res.status(400).json({
				status: 'error',
				message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
			});
		}

		// Validate file size (double check after multer)
		const maxSize = 5 * 1024 * 1024; // 5MB
		if (req.file.size > maxSize) {
			return res.status(413).json({
				status: 'error',
				message: 'File too large. Please select an image smaller than 5MB.',
			});
		}

		const result = await userService.uploadAvatar(req.user.user_id, req.file);

		console.log('✅ Avatar upload successful:', {
			userId: req.user.user_id,
			avatarUrl: result.avatar_url,
		});

		res.json(result);
	} catch (error) {
		console.error('❌ Avatar upload failed:', error);
		next(error);
	}
};

/**
 * @swagger
 * /api/users/deactivate:
 *   put:
 *     summary: Vô hiệu hóa tài khoản
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vô hiệu hóa tài khoản thành công
 */
exports.deactivateAccount = async (req, res, next) => {
	try {
		const result = await userService.deactivateAccount(req.user.user_id);
		res.json(result);
	} catch (error) {
		next(error);
	}
};
