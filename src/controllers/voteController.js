const { check } = require('express-validator');
const voteService = require('../services/voteService');
const validate = require('../middleware/validationMiddleware');

exports.create = [
  check('user_id').notEmpty().withMessage('ID người dùng là bắt buộc'),
  check('campaign_id').notEmpty().withMessage('ID chiến dịch là bắt buộc'),
  check('vote_weight').isInt({ min: 1 }).withMessage('Trọng số phiếu bầu phải lớn hơn 0'),
  validate,
  async (req, res, next) => {
    try {
      const vote = await voteService.create(req.body);
      res.status(201).json(vote);
    } catch (error) {
      next(error);
    }
  },
];

exports.getAll = async (req, res, next) => {
  try {
    const votes = await voteService.getAll();
    res.json(votes);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const vote = await voteService.getById(req.params.id);
    res.json(vote);
  } catch (error) {
    next(error);
  }
};

exports.update = [
  check('vote_weight').optional().isInt({ min: 1 }).withMessage('Trọng số phiếu bầu phải lớn hơn 0'),
  validate,
  async (req, res, next) => {
    try {
      const vote = await voteService.update(req.params.id, req.body);
      res.json(vote);
    } catch (error) {
      next(error);
    }
  },
];

exports.delete = async (req, res, next) => {
  try {
    await voteService.delete(req.params.id);
    res.json({ message: 'Đã xóa phiếu bầu' });
  } catch (error) {
    next(error);
  }
};