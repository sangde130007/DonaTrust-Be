const Campaign = require('../models/Campaign');
const { AppError } = require('../utils/errorHandler');

exports.create = async (data) => {
  const campaign = await Campaign.create(data);
  return campaign;
};

exports.getAll = async () => {
  return await Campaign.findAll();
};

exports.getById = async (id) => {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);
  return campaign;
};

exports.update = async (id, data) => {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);
  await campaign.update(data);
  return campaign;
};

exports.delete = async (id) => {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);
  await campaign.destroy();
};