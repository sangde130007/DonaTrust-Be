const { AppError } = require('../utils/errorHandler');
const Charity = require('../models/Charity');
const Campaign = require('../models/Campaign'); // 👈 NEW

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
      const charity = await Charity.findOne({ where: { user_id: req.user.user_id } });
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

    // Fallback DB
    if (u.user_id) {
      const row = await Charity.findOne({
        where: { user_id: u.user_id },
        attributes: ['charity_id'],
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

/**
 * NEW: isCampaignOwner
 * - Cho phép: admin
 * - Nếu campaign có các trường owner khả dĩ (owner_id/created_by/creator_id/owner.user_id/charity_owner_id)
 *   thì so sánh trực tiếp với req.user.user_id
 * - Nếu không, map qua Charity bằng campaign.charity_id -> charity.user_id
 * - Gắn req.campaign để controller dùng lại
 */
const isCampaignOwner = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError('Bạn cần đăng nhập để truy cập', 401));
    const userId = String(req.user.user_id || req.user.id || '');
    if (!userId) return next(new AppError('Thiếu thông tin người dùng', 401));

    if (req.user.role === 'admin') return next(); // admin pass

    const campaignId = req.params.id;
    const campaign = await Campaign.findOne({ where: { campaign_id: campaignId } });
    if (!campaign) return next(new AppError('Không tìm thấy chiến dịch', 404));

    const ownerCandidates = [
      campaign.owner_id,
      campaign.created_by,
      campaign.creator_id,
      campaign?.owner?.user_id,
      campaign.charity_owner_id,
    ].filter(Boolean).map(String);

    if (ownerCandidates.length && ownerCandidates.includes(userId)) {
      req.campaign = campaign;
      return next();
    }

    if (campaign.charity_id) {
      const charity = await Charity.findOne({ where: { charity_id: campaign.charity_id }, attributes: ['user_id'] });
      if (charity?.user_id && String(charity.user_id) === userId) {
        req.campaign = campaign;
        return next();
      }
    }

    return next(new AppError('Bạn không có quyền đăng cập nhật cho chiến dịch này.', 403));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // core
  requireRole,
  requireCharityOwnership,
  requireCharity,

  // shortcuts
  requireAdmin: requireRole('admin'),
  requireDonor: requireRole(['donor', 'admin']),
  requireCharityOnly: requireRole('charity'),
  requireCharityOrAdmin: requireRole(['charity', 'admin']),

  // NEW export
  isCampaignOwner,
};
