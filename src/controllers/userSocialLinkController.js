const { check } = require('express-validator');
const userSocialLinkService = require('../services/userSocialLinkService');
const validate = require('../middleware/validationMiddleware');

exports.create = [
  check('user_id').notEmpty().withMessage('ID người dùng là bắt buộc'),
  validate,
  async (req, res, next) => {
    try {
      const link = await userSocialLinkService.create(req.body);
      res.status(201).json(link);
    } catch (error) {
      next(error);
    }
  },
];

exports.getAll = async (req, res, next) => {
  try {
    const links = await userSocialLinkService.getAll();
    res.json(links);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const link = await userSocialLinkService.getById(req.params.id);
    res.json(link);
  } catch (error) {
    next(error);
  }
};

exports.update = [
  check('user_id').optional().notEmpty().withMessage('ID người dùng không được để trống'),
  validate,
  async (req, res, next) => {
    try {
      const link = await userSocialLinkService.update(req.params.id, req.body);
      res.json(link);
    } catch (error) {
      next(error);
    }
  },
];

exports.delete = async (req, res, next) => {
  try {
    await userSocialLinkService.delete(req.params.id);
    res.json({ message: 'Đã xóa liên kết xã hội' });
  } catch (error) {
    next(error);
  }
};