const Notification = require('../models/Notification');
const { AppError } = require('../utils/errorHandler');

exports.create = async (data) => {
  const notification = await Notification.create(data);
  return notification;
};

exports.getAll = async () => {
  return await Notification.findAll();
};

exports.getById = async (id) => {
  const notification = await Notification.findByPk(id);
  if (!notification) throw new AppError('Không tìm thấy thông báo', 404);
  return notification;
};

exports.update = async (id, data) => {
  const notification = await Notification.findByPk(id);
  if (!notification) throw new AppError('Không tìm thấy thông báo', 404);
  await notification.update(data);
  return notification;
};

exports.delete = async (id) => {
  const notification = await Notification.findByPk(id);
  if (!notification) throw new AppError('Không tìm thấy thông báo', 404);
  await notification.destroy();
};