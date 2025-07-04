const Feedback = require('../models/Feedback');
const { AppError } = require('../utils/errorHandler');

exports.create = async (data) => {
  const feedback = await Feedback.create(data);
  return feedback;
};

exports.getAll = async () => {
  return await Feedback.findAll();
};

exports.getById = async (id) => {
  const feedback = await Feedback.findByPk(id);
  if (!feedback) throw new AppError('Không tìm thấy phản hồi', 404);
  return feedback;
};

exports.update = async (id, data) => {
  const feedback = await Feedback.findByPk(id);
  if (!feedback) throw new AppError('Không tìm thấy phản hồi', 404);
  await feedback.update(data);
  return feedback;
};

exports.delete = async (id) => {
  const feedback = await Feedback.findByPk(id);
  if (!feedback) throw new AppError('Không tìm thấy phản hồi', 404);
  await feedback.destroy();
};