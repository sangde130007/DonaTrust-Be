const { check } = require('express-validator');
const campaignService = require('../services/campaignService');
const validate = require('../middleware/validationMiddleware');

exports.create = [
  check('charity_id').notEmpty().withMessage('ID tổ chức là bắt buộc'),
  check('title').notEmpty().withMessage('Tiêu đề là bắt buộc'),
  check('goal_amount').isFloat({ min: 0 }).withMessage('Số tiền mục tiêu không hợp lệ'),
  validate,
  async (req, res, next) => {
    try {
      const campaign = await campaignService.create(req.body);
      res.status(201).json(campaign);
    } catch (error) {
      next(error);
    }
  },
];

exports.getAll = async (req, res, next) => {
  try {
    const campaigns = await campaignService.getAll();
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const campaign = await campaignService.getById(req.params.id);
    res.json(campaign);
  } catch (error) {
    next(error);
  }
};

exports.update = [
  check('title').optional().notEmpty().withMessage('Tiêu đề không được để trống'),
  validate,
  async (req, res, next) => {
    try {
      const campaign = await campaignService.update(req.params.id, req.body);
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  },
];

exports.delete = async (req, res, next) => {
  try {
    await campaignService.delete(req.params.id);
    res.json({ message: 'Đã xóa chiến dịch' });
  } catch (error) {
    next(error);
  }
};