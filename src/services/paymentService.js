const Payment = require("../models/Payment");
const { AppError } = require("../utils/errorHandler");

exports.create = async (data) => {
  const payment = await Payment.create(data);
  return payment;
};

exports.getAll = async () => {
  return await Payment.findAll();
};

exports.getById = async (id) => {
  const payment = await Payment.findByPk(id);
  if (!payment) throw new AppError("Không tìm thấy giao dịch", 404);
  return payment;
};

exports.delete = async (id) => {
  const payment = await Payment.findByPk(id);
  if (!payment) throw new AppError("Không tìm thấy giao dịch", 404);
  await payment.destroy();
};
