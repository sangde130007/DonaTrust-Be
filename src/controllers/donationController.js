const { check } = require('express-validator');
const donationService = require('../services/donationService');
const validate = require('../middleware/validationMiddleware');

exports.create = [
  check('user_id').notEmpty().withMessage('ID người dùng là bắt buộc'),
  check('campaign_id').notEmpty().withMessage('ID chiến dịch là bắt buộc'),
  check('amount').isFloat({ min: 0 }).withMessage('Số tiền không hợp lệ'),
  validate,
  async (req, res, next) => {
    try {
      const donation = await donationService.create(req.body);
      res.status(201).json(donation);
    } catch (error) {
      next(error);
    }
  },
];

exports.getAll = async (req, res, next) => {
  try {
    const donations = await donationService.getAll();
    res.json(donations);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const donation = await donationService.getById(req.params.id);
    res.json(donation);
  } catch (error) {
    next(error);
  }
};

exports.update = [
  check('amount').optional().isFloat({ min: 0 }).withMessage('Số tiền không hợp lệ'),
  validate,
  async (req, res, next) => {
    try {
      const donation = await donationService.update(req.params.id, req.body);
      res.json(donation);
    } catch (error) {
      next(error);
    }
  },
];

exports.delete = async (req, res, next) => {
  try {
    await donationService.delete(req.params.id);
    res.json({ message: 'Đã xóa khoản quyên góp' });
  } catch (error) {
    next(error);
  }
};
