const Vote = require('../models/Vote');
const { AppError } = require('../utils/errorHandler');

exports.create = async (data) => {
  const vote = await Vote.create(data);
  return vote;
};

exports.getAll = async () => {
  return await Vote.findAll();
};

exports.getById = async (id) => {
  const vote = await Vote.findByPk(id);
  if (!vote) throw new AppError('Không tìm thấy phiếu bầu', 404);
  return vote;
};

exports.update = async (id, data) => {
  const vote = await Vote.findByPk(id);
  if (!vote) throw new AppError('Không tìm thấy phiếu bầu', 404);
  await vote.update(data);
  return vote;
};

exports.delete = async (id) => {
  const vote = await Vote.findByPk(id);
  if (!vote) throw new AppError('Không tìm thấy phiếu bầu', 404);
  await vote.destroy();
};