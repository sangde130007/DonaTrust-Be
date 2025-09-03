const { check } = require('express-validator');
const validate = require('../middleware/validationMiddleware');
const notificationService = require('../services/notificationService');

/**
 * ================== TẠO THÔNG BÁO ==================
 * - Nếu body không truyền user_id thì mặc định dùng req.user.user_id
 * - Dùng cho các thông báo hệ thống / sự kiện
 */
exports.create = [
  check('content').notEmpty().withMessage('Nội dung thông báo là bắt buộc'),
  check('title').optional().isString().trim(),
  check('type').optional().isIn(['system', 'fundraising', 'donation', 'other'])
    .withMessage('type không hợp lệ'),
  check('user_id').optional().isString().withMessage('user_id phải là chuỗi'),
  check('campaign_id').optional().isUUID().withMessage('campaign_id không hợp lệ'),
  validate,
  async (req, res, next) => {
    try {
      const payload = {
        user_id: String(req.body.user_id || req.user?.user_id),
        campaign_id: req.body.campaign_id || null,
        title: req.body.title || 'Thông báo',
        content: req.body.content,
        type: req.body.type || 'system',
      };
      if (!payload.user_id) {
        return res.status(400).json({ status: 'fail', message: 'ID người dùng là bắt buộc' });
      }
      const noti = await notificationService.create(payload);
      res.status(201).json({ status: 'success', data: noti });
    } catch (err) { next(err); }
  },
];


/**
 * ================== ADMIN – LẤY TẤT CẢ ==================
 * Hỗ trợ ?page=&limit=&search=&type=&is_read=
 */
exports.getAll = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, search = '', type, is_read
    } = req.query;

    const data = await notificationService.getAll({
      page: Number(page),
      limit: Number(limit),
      search,
      type,
      is_read: is_read === undefined ? undefined : is_read === 'true',
    });

    res.json({ status: 'success', ...data });
  } catch (err) { next(err); }
};

/**
 * ================== NGƯỜI DÙNG – LẤY DANH SÁCH ==================
 * Hỗ trợ ?page=&limit=&search=&tab=all|unread|fundraising&type=&order=newest|oldest
 */
exports.getMine = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const {
      page = 1, limit = 20, search = '', tab = 'all', type, order = 'newest'
    } = req.query;

    const filters = {
      page: Number(page),
      limit: Number(limit),
      search,
      type: type || (tab === 'fundraising' ? 'fundraising' : undefined),
      is_read: tab === 'unread' ? false : undefined,
      order,
    };

    const data = await notificationService.getForUser(userId, filters);
    res.json({ status: 'success', ...data });
  } catch (err) { next(err); }
};

/**
 * ================== ADMIN – LẤY CHI TIẾT THEO ID ==================
 */
exports.getById = async (req, res, next) => {
  try {
    const noti = await notificationService.getById(req.params.id);
    if (!noti) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy thông báo' });
    res.json({ status: 'success', data: noti });
  } catch (err) { next(err); }
};

/**
 * ================== NGƯỜI DÙNG – LẤY CHI TIẾT ==================
 */
exports.getMineById = async (req, res, next) => {
  try {
    const noti = await notificationService.getByIdOwned(req.params.id, req.user.user_id);
    if (!noti) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy thông báo' });
    res.json({ status: 'success', data: noti });
  } catch (err) { next(err); }
};

/**
 * ================== ADMIN – CẬP NHẬT ==================
 */
exports.update = [
  check('content').optional().isString().trim().notEmpty(),
  check('title').optional().isString().trim(),
  check('type').optional().isIn(['system', 'fundraising', 'donation', 'other']),
  check('is_read').optional().isBoolean(),
  validate,
  async (req, res, next) => {
    try {
      const noti = await notificationService.update(req.params.id, req.body);
      if (!noti) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy thông báo' });
      res.json({ status: 'success', data: noti });
    } catch (err) { next(err); }
  },
];

/**
 * ================== NGƯỜI DÙNG – CẬP NHẬT ==================
 */
exports.updateMine = [
  check('content').optional().isString().trim(),
  check('title').optional().isString().trim(),
  check('is_read').optional().isBoolean(),
  validate,
  async (req, res, next) => {
    try {
      const noti = await notificationService.updateOwned(
        req.params.id,
        req.user.user_id,
        req.body
      );
      if (!noti) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy thông báo' });
      res.json({ status: 'success', data: noti });
    } catch (err) { next(err); }
  },
];

/**
 * ================== ADMIN – XÓA ==================
 */
exports.delete = async (req, res, next) => {
  try {
    const ok = await notificationService.delete(req.params.id);
    if (!ok) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy thông báo' });
    res.json({ status: 'success', message: 'Đã xóa thông báo' });
  } catch (err) { next(err); }
};

/**
 * ================== NGƯỜI DÙNG – XÓA ==================
 */
exports.deleteMine = async (req, res, next) => {
  try {
    const ok = await notificationService.deleteOwned(req.params.id, req.user.user_id);
    if (!ok) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy thông báo' });
    res.json({ status: 'success', message: 'Đã xóa thông báo' });
  } catch (err) { next(err); }
};

/**
 * ================== NGƯỜI DÙNG – ĐÁNH DẤU ĐÃ ĐỌC 1 ==================
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const noti = await notificationService.markRead(req.params.id, req.user.user_id);
    if (!noti) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy thông báo' });
    res.json({ status: 'success', data: noti });
  } catch (err) { next(err); }
};

/**
 * ================== NGƯỜI DÙNG – ĐÁNH DẤU ĐÃ ĐỌC TẤT CẢ ==================
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const count = await notificationService.markAllRead(req.user.user_id);
    res.json({ status: 'success', updated: count });
  } catch (err) { next(err); }
};

/**
 * ================== NGƯỜI DÙNG – ĐẾM SỐ CHƯA ĐỌC ==================
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.countUnread(req.user.user_id);
    res.json({ status: 'success', count });
  } catch (err) { next(err); }
};
