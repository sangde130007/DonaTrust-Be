const { AppError } = require('../utils/errorHandler');
const Charity = require('../models/Charity');

/**
 * Generic role guard
 * @param {string|string[]} allowedRoles
 */
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Bạn cần đăng nhập để truy cập', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Bạn không có quyền truy cập chức năng này', 403));
    }
    next();
  };
};

/**
 * Kiểm tra quyền sở hữu charity:
 * - admin: pass
 * - charity: chỉ thao tác charity của chính mình (gắn req.userCharity)
 */
const requireCharityOwnership = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError('Bạn cần đăng nhập để truy cập', 401));

    if (req.user.role === 'admin') return next();

    if (req.user.role === 'charity') {
      const charity = await Charity.findOne({
        where: { user_id: req.user.user_id },
      });
      if (!charity) return next(new AppError('Bạn chưa đăng ký làm tổ chức từ thiện', 403));
      req.userCharity = charity;
      return next();
    }

    return next(new AppError('Bạn không có quyền truy cập chức năng này', 403));
  } catch (error) {
    next(error);
  }
};

/**
 * requireCharity:
 * - admin: pass
 * - charity: nếu token thiếu charity_id -> fallback DB theo user_id, gắn req.user.charity_id
 */
const requireCharity = async (req, res, next) => {
  try {
    const u = req.user;
    if (!u) return next(new AppError('Bạn cần đăng nhập để truy cập', 401));

    // Admin pass
    if (u.role === 'admin') return next();

    // Không phải charity
    if (u.role !== 'charity') {
      return next(new AppError('Không có quyền charity', 403));
    }

    // Token đã có charity_id -> pass
    if (u.charity_id || u?.charity?.charity_id) {
      req.user.charity_id = u.charity_id || u?.charity?.charity_id;
      return next();
    }

    // Fallback DB: lấy charity_id theo user_id (CHỈ charity_id, không query cột id)
    if (u.user_id) {
      const row = await Charity.findOne({
        where: { user_id: u.user_id },
        attributes: ['charity_id'], // ✅ chỉ lấy charity_id, tránh lỗi "column id does not exist"
      });
      if (row?.charity_id) {
        req.user.charity_id = row.charity_id;
        return next();
      }
    }

    return next(new AppError('Tài khoản charity chưa liên kết với tổ chức', 403));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // core
  requireRole,
  requireCharityOwnership,
  requireCharity,                 // middleware đúng, KHÔNG ghi đè

  // shortcuts (đặt tên khác, tránh trùng)
  requireAdmin: requireRole('admin'),
  requireDonor: requireRole(['donor', 'admin']),
  requireCharityOnly: requireRole('charity'),
  requireCharityOrAdmin: requireRole(['charity', 'admin']),
};
