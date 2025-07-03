const { check } = require('express-validator');
const notificationService = require('../services/notificationService');
const validate = require('../middleware/validationMiddleware');

exports.create = [
  check('user_id').notEmpty().withMessage('ID người dùng là bắt buộc'),
  check('content').notEmpty().withMessage('Nội dung thông báo là bắt buộc'),
  validate,
  async (req, res, next) => {
    try {
      const notification = await notificationService.create(req.body);
      res.status(201).json(notification);
    } catch (error) {
      next(error);
    }
  },
];

exports.getAll = async (req, res, next) => {
  try {
    const notifications = await notificationService.getAll();
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const notification = await notificationService.getById(req.params.id);
    res.json(notification);
  } catch (error) {
    next(error);
  }
};

exports.update = [
  check('content').optional().notEmpty().withMessage('Nội dung thông báo không được để trống'),
  validate,
  async (req, res, next) => {
    try {
      const notification = await notificationService.update(req.params.id, req.body);
      res.json(notification);
    } catch (error) {
      next(error);
    }
  },
];

exports.delete = async (req, res, next) => {
  try {
    await notificationService.delete(req.params.id);
    res.json({ message: 'Đã xóa thông báo' });
  } catch (error) {
    next(error);
  }
};