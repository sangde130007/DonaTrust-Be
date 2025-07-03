const { check } = require('express-validator');
const authService = require('../services/authService');
const validate = require('../middleware/validationMiddleware');

exports.register = [
  check('email').isEmail().withMessage('Email không hợp lệ'),
  check('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  check('user_id').notEmpty().withMessage('ID người dùng là bắt buộc'),
  check('phone').notEmpty().withMessage('Số điện thoại là bắt buộc'),
  validate,
  async (req, res, next) => {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ message: 'Đăng ký thành công, vui lòng kiểm tra email để xác thực', user });
    } catch (error) {
      next(error);
    }
  },
];

exports.verifyEmail = [
  check('token').notEmpty().withMessage('Token xác thực là bắt buộc'),
  validate,
  async (req, res, next) => {
    try {
      const user = await authService.verifyEmail(req.query.token);
      res.json({ message: 'Xác thực email thành công', user });
    } catch (error) {
      next(error);
    }
  },
];

exports.login = [
  check('email').isEmail().withMessage('Email không hợp lệ'),
  check('password').notEmpty().withMessage('Mật khẩu là bắt buộc'),
  validate,
  async (req, res, next) => {
    try {
      const { token, user } = await authService.login(req.body);
      res.json({ token, user });
    } catch (error) {
      next(error);
    }
  },
];

exports.googleLogin = [
  check('code').notEmpty().withMessage('Mã Google OAuth là bắt buộc'),
  validate,
  async (req, res, next) => {
    try {
      const { token, user } = await authService.googleLogin(req.body.code);
      res.json({ token, user });
    } catch (error) {
      next(error);
    }
  },
];
