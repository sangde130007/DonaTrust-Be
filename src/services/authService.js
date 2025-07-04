
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const UserSocialLink = require('../models/UserSocialLink');
const { AppError } = require('../utils/errorHandler');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.register = async (data) => {
  const { user_id, full_name, email, phone, password, role } = data;
  const hashedPassword = await bcrypt.hash(password, 10);

  const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const verificationExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const user = await User.create({
    user_id,
    full_name,
    email,
    phone,
    password: hashedPassword,
    role,
    email_verification_token: verificationToken,
    email_verification_expires_at: verificationExpiresAt,
  });

  const verificationUrl = `${process.env.EMAIL_VERIFICATION_URL}?token=${verificationToken}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Xác thực email cho Donatrust',
    html: `
      <p>Xin chào ${full_name},</p>
      <p>Vui lòng nhấp vào link dưới đây để xác thực email của bạn:</p>
      <a href="${verificationUrl}">Xác thực email</a>
      <p>Link này sẽ hết hạn trong 1 giờ.</p>
      <p>Trân trọng,<br>Đội ngũ Donatrust</p>
    `,
  });

  return user;
};

exports.verifyEmail = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('Lỗi xác thực token:', error);
    throw new AppError('Token xác thực không hợp lệ hoặc đã hết hạn', 400);
  }

  const user = await User.findOne({ where: { email: payload.email } });
  if (!user) {
    console.error('Không tìm thấy người dùng với email:', payload.email);
    throw new AppError('Không tìm thấy người dùng', 404);
  }
  if (user.email_verification_token !== token || user.email_verification_expires_at < new Date()) {
    console.error('Token không hợp lệ hoặc đã hết hạn:', { token, expires_at: user.email_verification_expires_at });
    throw new AppError('Token xác thực không hợp lệ hoặc đã hết hạn', 400);
  }

  await user.update({
    email_verified: true,
    email_verification_token: null,
    email_verification_expires_at: null,
  });

  console.log('Email xác thực thành công cho user:', user.email);
  return user;
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user || !await bcrypt.compare(password, user.password)) {
    console.error('Thông tin đăng nhập không hợp lệ:', { email });
    throw new AppError('Thông tin đăng nhập không hợp lệ', 401);
  }
  if (!user.email_verified) {
    console.error('Email chưa được xác thực:', { email, email_verified: user.email_verified });
    throw new AppError('Email chưa được xác thực', 403);
  }
  const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { token, user };
};

exports.googleLogin = async (code) => {
  const { tokens } = await client.getToken(code);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { sub: google_id, email, name } = payload;

  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({
      user_id: `google_${google_id}`,
      full_name: name,
      email,
      phone: 'not_set',
      password: 'google_oauth',
      role: 'donor',
      email_verified: true,
    });
    await UserSocialLink.create({
      user_id: user.user_id,
      google_id,
    });
  } else {
    const socialLink = await UserSocialLink.findOne({ where: { user_id: user.user_id } });
    if (!socialLink) {
      await UserSocialLink.create({
        user_id: user.user_id,
        google_id,
      });
    } else if (!socialLink.google_id) {
      await socialLink.update({ google_id });
    }
  }

  const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { token, user };
};
