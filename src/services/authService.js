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

// Initialize Google OAuth client
const client = new OAuth2Client(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
);

// Check if email config is valid
const isEmailConfigValid = () => {
	return (
		process.env.EMAIL_USER &&
		process.env.EMAIL_PASS &&
		process.env.EMAIL_USER !== 'your_gmail@gmail.com' &&
		process.env.EMAIL_PASS !== 'your_gmail_app_password'
	);
};

let transporter = null;

// Only create transporter if email config is valid
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
		return { messageId: 'email-failed', error: error.message };
	}
};

// Generate unique user ID
const generateUniqueUserId = async () => {
	let userId;
	let exists = true;

	while (exists) {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substr(2, 5);
		userId = `user_${timestamp}${random}`;

		const existingUser = await User.findByPk(userId);
		exists = !!existingUser;
	}

	return userId;
};

// Generate verification code
const generateVerificationCode = () => {
	return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate reset token
const generateResetToken = () => {
	return crypto.randomBytes(32).toString('hex');
};

// Check account lock
const checkAccountLock = (user) => {
	if (user.locked_until && user.locked_until > new Date()) {
		const lockTime = Math.ceil((user.locked_until - new Date()) / 60000);
		throw new AppError(`Tài khoản đã bị khóa. Thử lại sau ${lockTime} phút`, 423);
	}
};

// Handle failed login
const handleFailedLogin = async (user) => {
	const maxAttempts = 5;
	const lockTime = 15; // minutes

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

// Reset login attempts
const resetLoginAttempts = async (user) => {
	if (user.login_attempts > 0 || user.locked_until) {
		user.login_attempts = 0;
		user.locked_until = null;
		user.last_login = new Date();
		await user.save();
	}
};

// Create or update user from Google data
const createOrUpdateGoogleUser = async (googleData) => {
	const { sub: google_id, email, name, picture } = googleData;

	let user = await User.findOne({ where: { email } });

	if (!user) {
		// Create new user from Google
		const user_id = await generateUniqueUserId();

		user = await User.create({
			user_id,
			full_name: name,
			email,
			phone: 'not_provided', // Will require update later
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

		// Update last login and profile image
		await user.update({
			last_login: new Date(),
			profile_image: picture || user.profile_image,
			email_verified: true, // Ensure email is verified for Google users
		});

		logger.info(`User logged in via Google OAuth: ${email}`);
	}

	return user;
};

// Generate JWT token for user
const generateJWTToken = (user) => {
	return jwt.sign(
		{
			user_id: user.user_id,
			role: user.role,
			email: user.email,
		},
		process.env.JWT_SECRET,
		{ expiresIn: '7d' }
	);
};

// GOOGLE LOGIN WITH ID TOKEN (from @react-oauth/google)
exports.googleLoginWithToken = async (idToken) => {
	try {
		console.log('🔍 Verifying Google ID Token...');

		// Verify the ID token
		const ticket = await client.verifyIdToken({
			idToken: idToken,
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();
		console.log('✅ Google ID Token verified successfully');
		console.log('📋 Google user data:', {
			sub: payload.sub,
			email: payload.email,
			name: payload.name,
			picture: payload.picture,
			email_verified: payload.email_verified,
		});

		// Ensure email is verified by Google
		if (!payload.email_verified) {
			throw new AppError('Email chưa được Google xác thực', 400);
		}

		// Create or update user
		const user = await createOrUpdateGoogleUser(payload);

		// Generate JWT token
		const token = generateJWTToken(user);

		return {
			token,
			user: { ...user.toJSON(), password: undefined },
		};
	} catch (error) {
		logger.error('Google ID Token authentication error:', error);

		if (error.message.includes('Token used too early')) {
			throw new AppError('Google token được sử dụng quá sớm, vui lòng thử lại', 400);
		} else if (error.message.includes('Invalid token')) {
			throw new AppError('Google token không hợp lệ', 400);
		} else if (error.message.includes('Token expired')) {
			throw new AppError('Google token đã hết hạn', 400);
		} else if (error instanceof AppError) {
			throw error;
		} else {
			throw new AppError('Đăng nhập Google thất bại', 400);
		}
	}
};

// GOOGLE LOGIN WITH AUTHORIZATION CODE (traditional OAuth flow)
exports.googleLoginWithCode = async (code) => {
	try {
		console.log('🔍 Exchanging authorization code for tokens...');

		// Exchange authorization code for tokens
		const { tokens } = await client.getToken(code);

		// Verify the ID token
		const ticket = await client.verifyIdToken({
			idToken: tokens.id_token,
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();
		console.log('✅ Google authorization code exchanged successfully');
		console.log('📋 Google user data:', {
			sub: payload.sub,
			email: payload.email,
			name: payload.name,
			picture: payload.picture,
		});

		// Create or update user
		const user = await createOrUpdateGoogleUser(payload);

		// Generate JWT token
		const token = generateJWTToken(user);

		return {
			token,
			user: { ...user.toJSON(), password: undefined },
		};
	} catch (error) {
		logger.error('Google authorization code authentication error:', error);
		throw new AppError('Mã Google OAuth không hợp lệ hoặc đã hết hạn', 400);
	}
};

// REGISTER
exports.register = async (data) => {
	const { full_name, email, phone, password } = data;

	// Check if email and phone already exist
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
			throw new AppError('Số điện thoại đã được sử dụng', 400);
		}
	}

	// Generate unique user ID
	const user_id = await generateUniqueUserId();

	const hashedPassword = await bcrypt.hash(password, 12);
	const verificationToken = jwt.sign({ email, type: TOKEN_TYPES.EMAIL_VERIFICATION }, process.env.JWT_SECRET, {
		expiresIn: '24h',
	});
	const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

	// If no email config, auto verify email
	const emailVerified = !isEmailConfigValid();

	const user = await User.create({
		user_id,
		full_name,
		email,
		phone,
		password: hashedPassword,
		role: 'donor',
		email_verification_token: emailVerified ? null : verificationToken,
		email_verification_expires_at: emailVerified ? null : verificationExpiresAt,
		email_verified: emailVerified,
		status: emailVerified ? USER_STATUS.ACTIVE : USER_STATUS.INACTIVE,
	});

	// Send verification email if configured
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

// LOGIN
exports.login = async ({ email, password }) => {
	const user = await User.findOne({ where: { email } });

	if (!user) {
		throw new AppError('Thông tin đăng nhập không chính xác', 401);
	}

	// Check account lock
	checkAccountLock(user);

	// Check status
	if (user.status === USER_STATUS.BANNED) {
		throw new AppError('Tài khoản đã bị cấm', 403);
	}

	if (user.status === USER_STATUS.INACTIVE) {
		throw new AppError('Tài khoản chưa được kích hoạt', 403);
	}

	// Check password
	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (!isPasswordValid) {
		await handleFailedLogin(user);
		return;
	}

	// Check email verification (only when email config exists)
	if (isEmailConfigValid() && !user.email_verified) {
		throw new AppError('Email chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản', 403);
	}

	// Reset login attempts and update last login
	await resetLoginAttempts(user);

	// Generate token
	const token = generateJWTToken(user);

	logger.info(`User logged in: ${email}`);
	return {
		token,
		user: { ...user.toJSON(), password: undefined },
	};
};

// VERIFY EMAIL
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
		throw new AppError('Email đã được xác thực', 400);
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

// FORGOT PASSWORD
exports.forgotPassword = async (email) => {
	if (!isEmailConfigValid()) {
		throw new AppError('Chức năng reset password qua email hiện không khả dụng', 503);
	}

	const user = await User.findOne({ where: { email } });
	if (!user) {
		return { message: 'Nếu email tồn tại, link reset password đã được gửi' };
	}

	const resetToken = generateResetToken();
	const resetExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

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

// RESET PASSWORD
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

// SEND PHONE VERIFICATION
exports.sendPhoneVerification = async (userId) => {
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	if (user.phone_verified) {
		throw new AppError('Số điện thoại đã được xác thực', 400);
	}

	const verificationCode = generateVerificationCode();
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

	await user.update({
		phone_verification_code: verificationCode,
		phone_verification_expires_at: expiresAt,
	});

	// TODO: Integrate SMS service to send verification code
	logger.info(`Phone verification code for ${user.phone}: ${verificationCode}`);

	return {
		message: 'Mã xác thực đã được gửi đến số điện thoại của bạn',
		...(process.env.NODE_ENV === 'development' && { code: verificationCode }),
	};
};

// VERIFY PHONE
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

// LOGOUT
exports.logout = async (userId) => {
	logger.info(`User logged out: ${userId}`);
	return { message: 'Đăng xuất thành công' };
};

// REFRESH TOKEN
exports.refreshToken = async (userId) => {
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	const token = generateJWTToken(user);
	return { token };
};
