const Charity = require('../models/Charity');
const { AppError } = require('../utils/errorHandler');

exports.create = async (data) => {
  const charity = await Charity.create(data);
  return charity;
};

exports.getAll = async () => {
  return await Charity.findAll();
};

exports.getById = async (id) => {
  const charity = await Charity.findByPk(id);
  if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
  return charity;
};

exports.update = async (id, data) => {
  const charity = await Charity.findByPk(id);
  if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
  await charity.update(data);
  return charity;
};

exports.delete = async (id) => {
  const charity = await Charity.findByPk(id);
  if (!charity) throw new AppError('Không tìm thấy tổ chức từ thiện', 404);
  await charity.destroy();
};