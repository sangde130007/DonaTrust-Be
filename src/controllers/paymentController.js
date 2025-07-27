const { check } = require("express-validator");
const paymentService = require("../services/paymentService");
const validate = require("../middleware/validationMiddleware");

exports.create = [
  check("user_id").notEmpty().withMessage("ID người dùng là bắt buộc"),
  check("campaign_id").notEmpty().withMessage("ID chiến dịch là bắt buộc"),
  check("payment_amount")
    .isFloat({ min: 1 })
    .withMessage("Số tiền phải lớn hơn 0"),

  validate,
  async (req, res, next) => {
    try {
      const payment = await paymentService.create(req.body);
      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  },
];

exports.getAll = async (req, res, next) => {
  try {
    const payments = await paymentService.getAll();
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const payment = await paymentService.getById(req.params.id);
    res.json(payment);
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await paymentService.delete(req.params.id);
    res.json({ message: "Đã xóa donate" });
  } catch (error) {
    next(error);
  }
};
