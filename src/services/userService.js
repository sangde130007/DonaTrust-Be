const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');

exports.create = async (data) => {
  const user = await User.create(data);
  return user;
};

exports.getAll = async () => {
  return await User.findAll();
};

exports.getById = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  return user;
};

exports.update = async (id, data) => {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  await user.update(data);
  return user;
};

exports.delete = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  await user.destroy();
};