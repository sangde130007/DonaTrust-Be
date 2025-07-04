const { check } = require('express-validator');
const charityService = require('../services/charityService');
const validate = require('../middleware/validationMiddleware');

exports.create = [
  check('user_id').notEmpty().withMessage('ID người dùng là bắt buộc'),
  check('name').notEmpty().withMessage('Tên tổ chức là bắt buộc'),
  validate,
  async (req, res, next) => {
    try {
      const charity = await charityService.create(req.body);
      res.status(201).json(charity);
    } catch (error) {
      next(error);
    }
  },
];

exports.getAll = async (req, res, next) => {
  try {
    const charities = await charityService.getAll();
    res.json(charities);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const charity = await charityService.getById(req.params.id);
    res.json(charity);
  } catch (error) {
    next(error);
  }
};

exports.update = [
  check('name').optional().notEmpty().withMessage('Tên tổ chức không được để trống'),
  validate,
  async (req, res, next) => {
    try {
      const charity = await charityService.update(req.params.id, req.body);
      res.json(charity);
    } catch (error) {
      next(error);
    }
  },
];

exports.delete = async (req, res, next) => {
  try {
    await charityService.delete(req.params.id);
    res.json({ message: 'Đã xóa tổ chức từ thiện' });
  } catch (error) {
    next(error);
  }
};