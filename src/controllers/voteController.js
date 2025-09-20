const { check } = require('express-validator');
const voteService = require('../services/voteService');
const validate = require('../middleware/validationMiddleware');

/* ========= GUARDS ========= */
const ensureAuthenticated = (req, res, next) => {
  if (!req.user?.user_id) return res.status(401).json({ message: 'Unauthorized' });
  next();
};

const ensureDaoMember = (req, res, next) => {
  if (req.user?.role === 'dao') return next();
  return res.status(403).json({ message: 'Forbidden: chỉ thành viên DAO' });
};

/* ========= CREATE ========= */
// Chỉ DAO member. user_id lấy từ token, không cho client tự truyền.
exports.create = [
  ensureAuthenticated,
  ensureDaoMember,
  check('campaign_id').notEmpty().withMessage('ID chiến dịch là bắt buộc'),
  check('vote_weight').isInt({ min: 1 }).withMessage('Trọng số phiếu bầu phải lớn hơn 0'),
  validate,
  async (req, res, next) => {
    try {
      const payload = {
        ...req.body,
        user_id: req.user.user_id, // chốt từ token
      };
      const vote = await voteService.create(payload);
      res.status(201).json(vote);
    } catch (error) {
      next(error);
    }
  },
];

/* ========= READ ALL ========= */
// Cho phép DAO member xem danh sách vote (nếu muốn giới hạn hơn có thể lọc theo self).
exports.getAll = [
  ensureAuthenticated,
  ensureDaoMember,
  async (req, res, next) => {
    try {
      const votes = await voteService.getAll();
      res.json(votes);
    } catch (error) {
      next(error);
    }
  },
];

/* ========= READ ONE ========= */
exports.getById = [
  ensureAuthenticated,
  ensureDaoMember,
  async (req, res, next) => {
    try {
      const vote = await voteService.getById(req.params.id);
      res.json(vote);
    } catch (error) {
      next(error);
    }
  },
];

/* ========= UPDATE ========= */
// Chỉ DAO member & chỉ sửa phiếu của chính mình.
exports.update = [
  ensureAuthenticated,
  ensureDaoMember,
  check('vote_weight').optional().isInt({ min: 1 }).withMessage('Trọng số phiếu bầu phải lớn hơn 0'),
  validate,
  async (req, res, next) => {
    try {
      // Ép ownership trong service (khuyên dùng), hoặc kiểm tra thẳng tại controller:
      // const existing = await voteService.getById(req.params.id);
      // if (String(existing.user_id) !== String(req.user.user_id)) return res.status(403).json({ message: 'Bạn chỉ được sửa phiếu của mình' });

      const vote = await voteService.update(req.params.id, {
        ...req.body,
        _actor_user_id: req.user.user_id, // để service kiểm tra quyền sở hữu
      });
      res.json(vote);
    } catch (error) {
      next(error);
    }
  },
];

/* ========= DELETE ========= */
// Chỉ DAO member & chỉ xoá phiếu của chính mình.
exports.delete = [
  ensureAuthenticated,
  ensureDaoMember,
  async (req, res, next) => {
    try {
      // Tương tự: để service kiểm tra chủ sở hữu trước khi xoá
      await voteService.delete(req.params.id, req.user.user_id);
      res.json({ message: 'Đã xóa phiếu bầu' });
    } catch (error) {
      next(error);
    }
  },
];
