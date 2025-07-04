const { check } = require('express-validator');
const feedbackService = require('../services/feedbackService');
const validate = require('../middleware/validationMiddleware');

exports.create = [
  check('user_id').notEmpty().withMessage('ID người dùng là bắt buộc'),
  check('campaign_id').notEmpty().withMessage('ID chiến dịch là bắt buộc'),
  check('rating').isInt({ min: 1, max: 5 }).withMessage('Điểm đánh giá phải từ 1 đến 5'),
  validate,
  async (req, res, next) => {
    try {
      const feedback = await feedbackService.create(req.body);
      res.status(201).json(feedback);
    } catch (error) {
      next(error);
    }
  },
];

exports.getAll = async (req, res, next) => {
  try {
    const feedbacks = await feedbackService.getAll();
    res.json(feedbacks);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const feedback = await feedbackService.getById(req.params.id);
    res.json(feedback);
  } catch (error) {
    next(error);
  }
};

exports.update = [
  check('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Điểm đánh giá phải từ 1 đến 5'),
  validate,
  async (req, res, next) => {
    try {
      const feedback = await feedbackService.update(req.params.id, req.body);
      res.json(feedback);
    } catch (error) {
      next(error);
    }
  },
];

exports.delete = async (req, res, next) => {
  try {
    await feedbackService.delete(req.params.id);
    res.json({ message: 'Đã xóa phản hồi' });
  } catch (error) {
    next(error);
  }
};