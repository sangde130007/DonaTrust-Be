const { check } = require('express-validator');
const userService = require('../services/userService');
const validate = require('../middleware/validationMiddleware');

exports.create = [
  check('email').isEmail().withMessage('Email không hợp lệ'),
  check('user_id').notEmpty().withMessage('ID người dùng là bắt buộc'),
  validate,
  async (req, res, next) => {
    try {
      const user = await userService.create(req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  },
];

exports.getAll = async (req, res, next) => {
  try {
    const users = await userService.getAll();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.update = [
  check('email').optional().isEmail().withMessage('Email không hợp lệ'),
  validate,
  async (req, res, next) => {
    try {
      const user = await userService.update(req.params.id, req.body);
      res.json(user);
    } catch (error) {
      next(error);
    }
  },
];

exports.delete = async (req, res, next) => {
  try {
    await userService.delete(req.params.id);
    res.json({ message: 'Đã xóa người dùng' });
  } catch (error) {
    next(error);
  }
};