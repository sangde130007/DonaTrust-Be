const { AppError } = require('../utils/errorHandler');

/**
 * Middleware kiểm tra role của user
 * @param {string|Array} allowedRoles - Role được phép truy cập
 */
const requireRole = (allowedRoles) => {
	return (req, res, next) => {
		if (!req.user) {
			return next(new AppError('Bạn cần đăng nhập để truy cập', 401));
		}

		const userRole = req.user.role;
		const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

		if (!roles.includes(userRole)) {
			return next(new AppError('Bạn không có quyền truy cập chức năng này', 403));
		}

		next();
	};
};

/**
 * Middleware kiểm tra quyền sở hữu charity
 */
const requireCharityOwnership = async (req, res, next) => {
	try {
		if (!req.user) {
			return next(new AppError('Bạn cần đăng nhập để truy cập', 401));
		}

		// Admin có thể truy cập tất cả
		if (req.user.role === 'admin') {
			return next();
		}

		// Charity chỉ có thể truy cập charity của mình
		if (req.user.role === 'charity') {
			const Charity = require('../models/Charity');
			const charity = await Charity.findOne({
				where: { user_id: req.user.user_id },
			});

			if (!charity) {
				return next(new AppError('Bạn chưa đăng ký làm tổ chức từ thiện', 403));
			}

			req.userCharity = charity;
			return next();
		}

		return next(new AppError('Bạn không có quyền truy cập chức năng này', 403));
	} catch (error) {
		next(error);
	}
};

module.exports = {
	requireRole,
	requireCharityOwnership,
	// Shortcuts cho các role thường dùng
	requireAdmin: requireRole('admin'),
	requireCharity: requireRole(['charity', 'admin']),
	requireDonor: requireRole(['donor', 'admin']),
	requireCharityOrAdmin: requireRole(['charity', 'admin']),
};
