const Donation = require('../models/Donation');
const { AppError } = require('../utils/errorHandler');

exports.create = async (data) => {
  const donation = await Donation.create(data);
  return donation;
};

exports.getAll = async () => {
  return await Donation.findAll();
};

exports.getById = async (id) => {
  const donation = await Donation.findByPk(id);
  if (!donation) throw new AppError('Không tìm thấy khoản quyên góp', 404);
  return donation;
};

exports.update = async (id, data) => {
  const donation = await Donation.findByPk(id);
  if (!donation) throw new AppError('Không tìm thấy khoản quyên góp', 404);
  await donation.update(data);
  return donation;
};

exports.delete = async (id) => {
  const donation = await Donation.findByPk(id);
  if (!donation) throw new AppError('Không tìm thấy khoản quyên góp', 404);
  await donation.destroy();
};