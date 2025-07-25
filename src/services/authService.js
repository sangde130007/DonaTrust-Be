const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const UserSocialLink = require('../models/UserSocialLink');
const { AppError } = require('../utils/errorHandler');
const { TOKEN_TYPES, USER_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

const client = new OAuth2Client(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.GOOGLE_REDIRECT_URI
);

// Kiểm tra email config có hợp lệ không
	const isEmailConfigValid = () => {
		return (
			process.env.EMAIL_USER &&
			process.env.EMAIL_PASS 
		);
	};

	let transporter = null;

	// Chỉ tạo transporter nếu có cấu hình email hợp lệ
	if (isEmailConfigValid()) {
		transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASS,
			},
		});
	} else {
		logger.warn('Email configuration not found or invalid. Email features will be disabled.');
	}

// Helper function to send email with fallback
const sendEmail = async (mailOptions) => {
	if (!transporter || !isEmailConfigValid()) {
		logger.warn('Email not sent - configuration missing:', {
			to: mailOptions.to,
			subject: mailOptions.subject,
		});
		return { messageId: 'email-disabled' };
	}

	try {
		const result = await transporter.sendMail(mailOptions);
		logger.info(`Email sent successfully to: ${mailOptions.to}`);
		return result;
	} catch (error) {
		logger.error('Email sending failed:', error.message);
		// Không throw error để không block registration process
		return { messageId: 'email-failed', error: error.message };
	}
};

// Tạo user_id unique
const generateUniqueUserId = async () => {
	let userId;
	let exists = true;

	while (exists) {
		// Tạo user_id dạng "user_" + timestamp + random
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substr(2, 5);
		userId = `user_${timestamp}${random}`;

		// Kiểm tra xem user_id đã tồn tại chưa
		const existingUser = await User.findByPk(userId);
		exists = !!existingUser;
	}

	return userId;
};

// Tạo mã xác thực ngẫu nhiên
const generateVerificationCode = () => {
	return Math.floor(100000 + Math.random() * 900000).toString();
};

// Tạo token reset password
const generateResetToken = () => {
	return crypto.randomBytes(32).toString('hex');
};

// Kiểm tra account lock
const checkAccountLock = (user) => {
	if (user.locked_until && user.locked_until > new Date()) {
		const lockTime = Math.ceil((user.locked_until - new Date()) / 60000);
		throw new AppError(`Tài khoản đã bị khóa. Thử lại sau ${lockTime} phút`, 423);
	}
};

// Xử lý đăng nhập thất bại
const handleFailedLogin = async (user) => {
	const maxAttempts = 5;
	const lockTime = 15; // phút

	user.login_attempts = (user.login_attempts || 0) + 1;

	if (user.login_attempts >= maxAttempts) {
		user.locked_until = new Date(Date.now() + lockTime * 60 * 1000);
		user.login_attempts = 0;
		await user.save();
		throw new AppError(`Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần. Thử lại sau ${lockTime} phút`, 423);
	}

	await user.save();
	const remainingAttempts = maxAttempts - user.login_attempts;
	throw new AppError(`Thông tin đăng nhập không chính xác. Còn ${remainingAttempts} lần thử`, 401);
};

// Reset login attempts khi đăng nhập thành công
const resetLoginAttempts = async (user) => {
	if (user.login_attempts > 0 || user.locked_until) {
		user.login_attempts = 0;
		user.locked_until = null;
		user.last_login = new Date();
		await user.save();
	}
};

exports.register = async (data) => {
	const { full_name, email, phone, password } = data;

	// Kiểm tra email và phone đã tồn tại
	const existingUser = await User.findOne({
		where: {
			[require('sequelize').Op.or]: [{ email }, { phone }],
		},
	});

	if (existingUser) {
		if (existingUser.email === email) {
			throw new AppError('Email đã được sử dụng', 400);
		}
		if (existingUser.phone === phone) {
			throw new AppError('Số điện 	 đã được sử dụng', 400);
		}
	}

	// Tự động sinh user_id unique
	const user_id = await generateUniqueUserId();

	const hashedPassword = await bcrypt.hash(password, 12);
	const verificationToken = jwt.sign({ email, type: TOKEN_TYPES.EMAIL_VERIFICATION }, process.env.JWT_SECRET, {
		expiresIn: '24h',
	});
	const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

	// Nếu không có email config, tự động verify email
	const emailVerified = !isEmailConfigValid();

	const user = await User.create({
		user_id,
		full_name,
		email,
		phone,
		password: hashedPassword,
		role: 'donor', // Mặc định là donor (người dùng cá nhân)
		email_verification_token: emailVerified ? null : verificationToken,
		email_verification_expires_at: emailVerified ? null : verificationExpiresAt,
		email_verified: emailVerified,
		status: emailVerified ? USER_STATUS.ACTIVE : USER_STATUS.INACTIVE,
	});

	// Gửi email xác thực (nếu có cấu hình)
	if (isEmailConfigValid()) {
		const verificationUrl = `${
			process.env.EMAIL_VERIFICATION_URL || 'http://localhost:4028/verify-email'
		}?token=${verificationToken}`;
		await sendEmail({
			from: process.env.EMAIL_USER,
			to: email,
			subject: 'Xác thực email cho DonaTrust',
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #2c5aa0;">Chào mừng đến với DonaTrust!</h2>
					<p>Xin chào <strong>${full_name}</strong>,</p>
					<p>Cảm ơn bạn đã đăng ký tài khoản DonaTrust. Vui lòng nhấp vào nút dưới đây để xác thực email của bạn:</p>
					<div style="text-align: center; margin: 30px 0;">
						<a href="${verificationUrl}" style="background-color: #2c5aa0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Xác thực Email</a>
					</div>
					<p><strong>Lưu ý:</strong> Link này sẽ hết hạn trong 24 giờ.</p>
					<p>Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
					<hr style="margin: 30px 0;">
					<p style="color: #666; font-size: 12px;">
						Trân trọng,<br>
						Đội ngũ DonaTrust<br>
						Email: support@donatrust.com
					</p>
				</div>
			`,
		});
	}

	logger.info(`User registered: ${email} with ID: ${user_id} (Email verified: ${emailVerified})`);

	const message = emailVerified
		? 'Đăng ký thành công! Tài khoản đã được kích hoạt (Email verification tạm thời bị tắt)'
		: 'Đăng ký thành công, vui lòng kiểm tra email để xác thực';

	return {
		message,
		user: { ...user.toJSON(), password: undefined },
		emailConfigured: isEmailConfigValid(),
	};
};

exports.verifyEmail = async (token) => {
	if (!isEmailConfigValid()) {
		throw new AppError('Chức năng xác thực email hiện không khả dụng', 503);
	}

	let payload;
	try {
		payload = jwt.verify(token, process.env.JWT_SECRET);
	} catch (error) {
		logger.error('Email verification token error:', error);
		throw new AppError('Token xác thực không hợp lệ hoặc đã hết hạn', 400);
	}

	if (payload.type !== TOKEN_TYPES.EMAIL_VERIFICATION) {
		throw new AppError('Token không hợp lệ', 400);
	}

	const user = await User.findOne({ where: { email: payload.email } });
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

if (user.email_verified) {
	logger.info(`Email already verified: ${user.email}`);
	return { ...user.toJSON(), password: undefined, alreadyVerified: true };
}


	if (user.email_verification_token !== token || user.email_verification_expires_at < new Date()) {
		throw new AppError('Token xác thực không hợp lệ hoặc đã hết hạn', 400);
	}

	await user.update({
		email_verified: true,
		email_verification_token: null,
		email_verification_expires_at: null,
		status: USER_STATUS.ACTIVE,
	});

	logger.info(`Email verified successfully: ${user.email}`);
	return { ...user.toJSON(), password: undefined };
};

exports.login = async ({ email, password }) => {
	const user = await User.findOne({ where: { email } });

	if (!user) {
		throw new AppError('Thông tin đăng nhập không chính xác', 401);
	}

	// Kiểm tra account lock
	checkAccountLock(user);

	// Kiểm tra status
	if (user.status === USER_STATUS.BANNED) {
		throw new AppError('Tài khoản đã bị cấm', 403);
	}

	if (user.status === USER_STATUS.INACTIVE) {
		throw new AppError('Tài khoản chưa được kích hoạt', 403);
	}

	// Kiểm tra password
	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (!isPasswordValid) {
		await handleFailedLogin(user);
		return; // handleFailedLogin sẽ throw error
	}

	// Kiểm tra email verification (chỉ khi có email config)
	if (isEmailConfigValid() && !user.email_verified) {
		throw new AppError('Email chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản', 403);
	}

	// Reset login attempts và update last login
	await resetLoginAttempts(user);

	// Tạo token với thời gian hết hạn dài hơn
	const token = jwt.sign(
		{
			user_id: user.user_id,
			role: user.role,
			email: user.email,
		},
		process.env.JWT_SECRET,
		{ expiresIn: '7d' }
	);

	logger.info(`User logged in: ${email}`);
	return {
		token,
		user: { ...user.toJSON(), password: undefined },
	};
};

exports.googleLogin = async (code) => {
	try {
		const { tokens } = await client.getToken(code);
		const ticket = await client.verifyIdToken({
			idToken: tokens.id_token,
			audience: process.env.GOOGLE_CLIENT_ID,
		});
		const payload = ticket.getPayload();
		const { sub: google_id, email, name, picture } = payload;

		let user = await User.findOne({ where: { email } });

		if (!user) {
			// Tạo user mới từ Google với user_id tự động
			const user_id = await generateUniqueUserId();

			user = await User.create({
				user_id,
				full_name: name,
				email,
				phone: 'not_provided', // Sẽ yêu cầu update sau
				password: crypto.randomBytes(32).toString('hex'), // Random password
				role: 'donor',
				email_verified: true,
				status: USER_STATUS.ACTIVE,
				profile_image: picture,
				last_login: new Date(),
			});

			await UserSocialLink.create({
				user_id: user.user_id,
				google_id,
			});

			logger.info(`New user created via Google OAuth: ${email} with ID: ${user_id}`);
		} else {
			// Update existing user
			const socialLink = await UserSocialLink.findOne({ where: { user_id: user.user_id } });
			if (!socialLink) {
				await UserSocialLink.create({
					user_id: user.user_id,
					google_id,
				});
			} else if (!socialLink.google_id) {
				await socialLink.update({ google_id });
			}

			// Update last login
			await user.update({
				last_login: new Date(),
				profile_image: picture || user.profile_image,
			});

			logger.info(`User logged in via Google OAuth: ${email}`);
		}

		const token = jwt.sign(
			{
				user_id: user.user_id,
				role: user.role,
				email: user.email,
			},
			process.env.JWT_SECRET,
			{ expiresIn: '7d' }
		);

		return {
			token,
			user: { ...user.toJSON(), password: undefined },
		};
	} catch (error) {
		logger.error('Google OAuth error:', error);
		throw new AppError('Đăng nhập Google thất bại', 400);
	}
};

exports.forgotPassword = async (email) => {
	if (!isEmailConfigValid()) {
		throw new AppError('Chức năng reset password qua email hiện không khả dụng', 503);
	}

	const user = await User.findOne({ where: { email } });
	if (!user) {
		// Không tiết lộ email không tồn tại để bảo mật
		return { message: 'Nếu email tồn tại, link reset password đã được gửi' };
	}

	const resetToken = generateResetToken();
	const resetExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 phút

	await user.update({
		password_reset_token: resetToken,
		password_reset_expires_at: resetExpiresAt,
	});

	const resetUrl = `${process.env.RESET_PASSWORD_URL}?token=${resetToken}`;

	await sendEmail({
		from: process.env.EMAIL_USER,
		to: email,
		subject: 'Đặt lại mật khẩu DonaTrust',
		html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #2c5aa0;">Đặt lại mật khẩu</h2>
				<p>Xin chào <strong>${user.full_name}</strong>,</p>
				<p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản DonaTrust. Nhấp vào nút dưới đây để đặt lại mật khẩu:</p>
				<div style="text-align: center; margin: 30px 0;">
					<a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Đặt lại mật khẩu</a>
				</div>
				<p><strong>Lưu ý:</strong> Link này sẽ hết hạn trong 30 phút.</p>
				<p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
				<hr style="margin: 30px 0;">
				<p style="color: #666; font-size: 12px;">
					Trân trọng,<br>
					Đội ngũ DonaTrust
				</p>
			</div>
		`,
	});

	logger.info(`Password reset requested: ${email}`);
	return { message: 'Nếu email tồn tại, link reset password đã được gửi' };
};

exports.resetPassword = async (token, newPassword) => {
	const user = await User.findOne({
		where: {
			password_reset_token: token,
			password_reset_expires_at: { [require('sequelize').Op.gt]: new Date() },
		},
	});

	if (!user) {
		throw new AppError('Token reset password không hợp lệ hoặc đã hết hạn', 400);
	}

	const hashedPassword = await bcrypt.hash(newPassword, 12);

	await user.update({
		password: hashedPassword,
		password_reset_token: null,
		password_reset_expires_at: null,
		login_attempts: 0,
		locked_until: null,
	});

	logger.info(`Password reset successful: ${user.email}`);
	return { message: 'Mật khẩu đã được đặt lại thành công' };
};

exports.sendPhoneVerification = async (userId) => {
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	if (user.phone_verified) {
		throw new AppError('Số điện thoại đã được xác thực', 400);
	}

	const verificationCode = generateVerificationCode();
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

	await user.update({
		phone_verification_code: verificationCode,
		phone_verification_expires_at: expiresAt,
	});

	// TODO: Tích hợp SMS service để gửi mã xác thực
	// Hiện tại chỉ log cho development
	logger.info(`Phone verification code for ${user.phone}: ${verificationCode}`);

	return {
		message: 'Mã xác thực đã được gửi đến số điện thoại của bạn',
		// Trong môi trường development, trả về code để test
		...(process.env.NODE_ENV === 'development' && { code: verificationCode }),
	};
};

exports.verifyPhone = async (userId, code) => {
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	if (user.phone_verified) {
		throw new AppError('Số điện thoại đã được xác thực', 400);
	}

	if (!user.phone_verification_code || user.phone_verification_expires_at < new Date()) {
		throw new AppError('Mã xác thực không hợp lệ hoặc đã hết hạn', 400);
	}

	if (user.phone_verification_code !== code) {
		throw new AppError('Mã xác thực không chính xác', 400);
	}

	await user.update({
		phone_verified: true,
		phone_verification_code: null,
		phone_verification_expires_at: null,
		phone_verified_at: new Date(),
	});

	logger.info(`Phone verified successfully: ${user.phone}`);
	return { message: 'Số điện thoại đã được xác thực thành công' };
};

exports.logout = async (userId) => {
	// TODO: Implement token blacklist if needed
	logger.info(`User logged out: ${userId}`);
	return { message: 'Đăng xuất thành công' };
};

exports.refreshToken = async (userId) => {
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	const token = jwt.sign(
		{
			user_id: user.user_id,
			role: user.role,
			email: user.email,
		},
		process.env.JWT_SECRET,
		{ expiresIn: '7d' }
	);

	return { token };
};
