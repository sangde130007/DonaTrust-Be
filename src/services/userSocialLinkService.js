const UserSocialLink = require('../models/UserSocialLink');
const { AppError } = require('../utils/errorHandler');

exports.create = async (data) => {
  const link = await UserSocialLink.create(data);
  return link;
};

exports.getAll = async () => {
  return await UserSocialLink.findAll();
};

exports.getById = async (id) => {
  const link = await UserSocialLink.findByPk(id);
  if (!link) throw new AppError('Không tìm thấy liên kết xã hội', 404);
  return link;
};

exports.update = async (id, data) => {
  const link = await UserSocialLink.findByPk(id);
  if (!link) throw new AppError('Không tìm thấy liên kết xã hội', 404);
  await link.update(data);
  return link;
};

exports.delete = async (id) => {
  const link = await UserSocialLink.findByPk(id);
  if (!link) throw new AppError('Không tìm thấy liên kết xã hội', 404);
  await link.destroy();
};