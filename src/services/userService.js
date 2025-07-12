const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { USER_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

exports.create = async (data) => {
	const user = await User.create(data);
	return user;
};

exports.getAll = async () => {
	return await User.findAll();
};

exports.getById = async (id) => {
	const user = await User.findByPk(id);
	if (!user) throw new AppError('Không tìm thấy người dùng', 404);
	return user;
};

exports.update = async (id, data) => {
	const user = await User.findByPk(id);
	if (!user) throw new AppError('Không tìm thấy người dùng', 404);
	await user.update(data);
	return user;
};

exports.delete = async (id) => {
	const user = await User.findByPk(id);
	if (!user) throw new AppError('Không tìm thấy người dùng', 404);
	await user.destroy();
};

exports.getProfile = async (userId) => {
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	return { ...user.toJSON(), password: undefined };
};

exports.updateProfile = async (userId, updateData) => {
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	// Kiểm tra phone unique nếu có thay đổi
	if (updateData.phone && updateData.phone !== user.phone) {
		const existingUser = await User.findOne({ where: { phone: updateData.phone } });
		if (existingUser) {
			throw new AppError('Số điện thoại đã được sử dụng', 400);
		}
		// Reset phone verification nếu thay đổi số điện thoại
		updateData.phone_verified = false;
		updateData.phone_verified_at = null;
	}

	// Không cho phép update một số fields nhạy cảm
	const allowedFields = [
		'full_name',
		'phone',
		'district',
		'ward',
		'address',
		'date_of_birth',
		'gender',
		'bio',
		'profile_image',
	];

	const filteredData = {};
	for (const field of allowedFields) {
		if (updateData[field] !== undefined) {
			filteredData[field] = updateData[field];
		}
	}

	await user.update(filteredData);

	logger.info(`User profile updated: ${user.email}`);
	return { ...user.toJSON(), password: undefined };
};

exports.changePassword = async (userId, currentPassword, newPassword) => {
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	// Kiểm tra mật khẩu hiện tại
	const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
	if (!isCurrentPasswordValid) {
		throw new AppError('Mật khẩu hiện tại không chính xác', 400);
	}

	// Kiểm tra mật khẩu mới không trùng với mật khẩu cũ
	const isSamePassword = await bcrypt.compare(newPassword, user.password);
	if (isSamePassword) {
		throw new AppError('Mật khẩu mới phải khác với mật khẩu hiện tại', 400);
	}

	const hashedNewPassword = await bcrypt.hash(newPassword, 12);
	await user.update({ password: hashedNewPassword });

	logger.info(`Password changed successfully: ${user.email}`);
	return { message: 'Đổi mật khẩu thành công' };
};

exports.uploadAvatar = async (userId, file) => {
	if (!file) {
		throw new AppError('Không có file được upload', 400);
	}

	// Kiểm tra loại file (multer đã filter rồi nhưng double check)
	const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
	if (!allowedTypes.includes(file.mimetype)) {
		throw new AppError('Chỉ cho phép upload file ảnh (JPEG, PNG, GIF, WebP)', 400);
	}

	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	// Sử dụng filename mà multer đã tạo
	const avatarUrl = `/uploads/avatars/${file.filename}`;

	await user.update({ profile_image: avatarUrl });

	logger.info(`Avatar uploaded successfully: ${user.email}, file: ${file.filename}`);
	return {
		message: 'Upload ảnh đại diện thành công',
		avatar_url: avatarUrl,
		user: { ...user.toJSON(), password: undefined },
	};
};

exports.deactivateAccount = async (userId) => {
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	await user.update({ status: USER_STATUS.INACTIVE });

	logger.info(`Account deactivated: ${user.email}`);
	return { message: 'Tài khoản đã được vô hiệu hóa' };
};

exports.getUserById = async (userId) => {
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	return { ...user.toJSON(), password: undefined };
};

exports.getAllUsers = async (filters = {}) => {
	const { role, status, page = 1, limit = 10 } = filters;
	const offset = (page - 1) * limit;

	const whereClause = {};
	if (role) whereClause.role = role;
	if (status) whereClause.status = status;

	const users = await User.findAndCountAll({
		where: whereClause,
		attributes: { exclude: ['password'] },
		limit: parseInt(limit),
		offset: parseInt(offset),
		order: [['created_at', 'DESC']],
	});

	return {
		users: users.rows,
		total: users.count,
		page: parseInt(page),
		limit: parseInt(limit),
		totalPages: Math.ceil(users.count / limit),
	};
};

exports.updateUserStatus = async (userId, status) => {
	const user = await User.findByPk(userId);
	if (!user) {
		throw new AppError('Không tìm thấy người dùng', 404);
	}

	await user.update({ status });

	logger.info(`User status updated: ${user.email} -> ${status}`);
	return { ...user.toJSON(), password: undefined };
};
